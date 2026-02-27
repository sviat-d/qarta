import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import { eq, and, gte, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { STRIPE_EVENTS_OF_INTEREST } from "@qarta/shared";
import type {
  Alert,
  Policy,
  PolicyCondition,
  PolicyAction,
  SafetyRails,
  AlertStatus,
} from "@qarta/shared";
import {
  parseEarlyFraudWarning,
  parseDispute,
  type ParsedAlert,
} from "../services/alert-processor.js";
import {
  evaluateAlert,
  type PolicyDecision,
} from "../services/policy-engine.js";
import { executeRefund } from "../services/refund-executor.js";
import { getCharge } from "../providers/stripe.js";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

export async function webhookRoutes(app: FastifyInstance) {
  // Override JSON parser in this scope to preserve raw body for signature verification
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      try {
        ((_req as unknown as Record<string, unknown>).rawBody) = body as Buffer;
        done(null, JSON.parse((body as Buffer).toString()));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post("/stripe", async (request, reply) => {
    // --- 1. Verify Stripe webhook signature ---
    const sig = request.headers["stripe-signature"] as string | undefined;
    let event: Stripe.Event;

    if (config.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        const rawBody = (request as unknown as Record<string, unknown>)
          .rawBody as Buffer;
        const stripe = new Stripe(config.STRIPE_SECRET_KEY ?? "unused");
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          config.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        app.log.warn({ err }, "Webhook signature verification failed");
        return reply.status(400).send({ error: "Invalid signature" });
      }
    } else {
      // Development: accept without verification
      event = request.body as Stripe.Event;
    }

    app.log.info(
      { type: event.type, id: event.id },
      "Received Stripe webhook",
    );

    // Only process events we care about
    if (
      !STRIPE_EVENTS_OF_INTEREST.includes(
        event.type as (typeof STRIPE_EVENTS_OF_INTEREST)[number],
      )
    ) {
      return reply.status(200).send({ received: true, processed: false });
    }

    // --- 2. Idempotency check ---
    const existing = await db.query.webhookEvents.findFirst({
      where: eq(schema.webhookEvents.stripeEventId, event.id),
    });

    if (existing) {
      app.log.info({ eventId: event.id }, "Duplicate webhook event, skipping");
      return reply
        .status(200)
        .send({ received: true, processed: false, duplicate: true });
    }

    // --- 3. Store raw event ---
    const webhookEventId = nanoid();
    await db.insert(schema.webhookEvents).values({
      id: webhookEventId,
      stripeEventId: event.id,
      type: event.type,
      payload: event.data.object as unknown as Record<string, unknown>,
    });

    // --- 4. Find merchant by Stripe account ---
    const stripeAccountId = (event as unknown as Record<string, unknown>).account as
      | string
      | undefined;

    let merchant: typeof schema.merchants.$inferSelect | undefined;

    if (stripeAccountId) {
      merchant =
        (await db.query.merchants.findFirst({
          where: eq(schema.merchants.stripeAccountId, stripeAccountId),
        })) ?? undefined;
    }

    // Development fallback: use first merchant when testing with stripe listen
    if (!merchant && config.NODE_ENV === "development") {
      const [first] = await db.select().from(schema.merchants).limit(1);
      merchant = first;
    }

    if (!merchant) {
      app.log.warn(
        { stripeAccountId },
        "No merchant found for webhook event",
      );
      await db
        .update(schema.webhookEvents)
        .set({ processedAt: new Date() })
        .where(eq(schema.webhookEvents.id, webhookEventId));
      return reply
        .status(200)
        .send({ received: true, processed: false, reason: "merchant_not_found" });
    }

    // --- 5. Process event ---
    try {
      switch (event.type) {
        case "radar.early_fraud_warning.created": {
          const efw = event.data.object as {
            id: string;
            actionable: boolean;
            charge: string;
            payment_intent?: string;
            created: number;
          };

          // Fetch charge details (amount, currency, customer info)
          let chargeDetails: Awaited<ReturnType<typeof getCharge>> = {
            amount: 0,
            currency: "USD",
          };

          if (config.STRIPE_SECRET_KEY) {
            try {
              chargeDetails = await getCharge(
                config.STRIPE_SECRET_KEY,
                efw.charge,
                stripeAccountId,
              );
            } catch (err) {
              app.log.error(
                { err, chargeId: efw.charge },
                "Failed to fetch charge details",
              );
            }
          }

          const parsed = parseEarlyFraudWarning(
            efw,
            chargeDetails.amount,
            chargeDetails.currency,
          );

          // Create alert in DB
          const alertId = nanoid();
          await db.insert(schema.alerts).values({
            id: alertId,
            merchantId: merchant.id,
            source: parsed.source,
            status: "new",
            stripeChargeId: parsed.stripeChargeId,
            stripePaymentIntentId: parsed.stripePaymentIntentId,
            stripeEfwId: parsed.stripeEfwId,
            amount: parsed.amount,
            currency: parsed.currency,
            reasonCategory: parsed.reasonCategory,
            reasonRaw: parsed.reasonRaw,
            customerEmail: chargeDetails.customerEmail,
            customerId: chargeDetails.customerId,
            cardLast4: chargeDetails.cardLast4,
            cardBrand: chargeDetails.cardBrand,
            isActionable: parsed.isActionable,
          });

          // Run through policy engine + execute action
          await processAlertWithPolicies(
            app.log,
            merchant,
            alertId,
            parsed,
            stripeAccountId,
          );

          app.log.info(
            { efwId: efw.id, alertId, charge: efw.charge },
            "Processed EFW alert",
          );
          break;
        }

        case "charge.dispute.created": {
          const dispute = event.data.object as {
            id: string;
            charge: string;
            payment_intent?: string;
            amount: number;
            currency: string;
            reason: string;
            status: string;
          };

          const parsed = parseDispute(dispute);

          // Fetch customer details from charge
          let customerInfo: {
            customerId?: string;
            customerEmail?: string;
            cardLast4?: string;
            cardBrand?: string;
          } = {};

          if (config.STRIPE_SECRET_KEY) {
            try {
              const charge = await getCharge(
                config.STRIPE_SECRET_KEY,
                dispute.charge,
                stripeAccountId,
              );
              customerInfo = {
                customerId: charge.customerId,
                customerEmail: charge.customerEmail,
                cardLast4: charge.cardLast4,
                cardBrand: charge.cardBrand,
              };
            } catch (err) {
              app.log.error(
                { err, chargeId: dispute.charge },
                "Failed to fetch charge details for dispute",
              );
            }
          }

          // Create alert in DB
          const alertId = nanoid();
          await db.insert(schema.alerts).values({
            id: alertId,
            merchantId: merchant.id,
            source: parsed.source,
            status: "new",
            stripeChargeId: parsed.stripeChargeId,
            stripePaymentIntentId: parsed.stripePaymentIntentId,
            stripeDisputeId: parsed.stripeDisputeId,
            amount: parsed.amount,
            currency: parsed.currency,
            reasonCategory: parsed.reasonCategory,
            reasonRaw: parsed.reasonRaw,
            customerEmail: customerInfo.customerEmail,
            customerId: customerInfo.customerId,
            cardLast4: customerInfo.cardLast4,
            cardBrand: customerInfo.cardBrand,
            isActionable: parsed.isActionable,
          });

          await processAlertWithPolicies(
            app.log,
            merchant,
            alertId,
            parsed,
            stripeAccountId,
          );

          app.log.info(
            { disputeId: dispute.id, alertId, charge: dispute.charge },
            "Processed dispute alert",
          );
          break;
        }

        case "charge.dispute.updated":
        case "charge.dispute.closed": {
          const dispute = event.data.object as {
            id: string;
            status: string;
          };

          const existingAlert = await db.query.alerts.findFirst({
            where: and(
              eq(schema.alerts.merchantId, merchant.id),
              eq(schema.alerts.stripeDisputeId, dispute.id),
            ),
          });

          if (existingAlert) {
            // If dispute was won, mark as dismissed; otherwise keep current status
            const newStatus: AlertStatus =
              dispute.status === "won"
                ? "dismissed"
                : (existingAlert.status as AlertStatus);

            await db
              .update(schema.alerts)
              .set({ status: newStatus, updatedAt: new Date() })
              .where(eq(schema.alerts.id, existingAlert.id));

            await db.insert(schema.auditLog).values({
              id: nanoid(),
              merchantId: merchant.id,
              alertId: existingAlert.id,
              actor: "system",
              event: `dispute_${event.type === "charge.dispute.closed" ? "closed" : "updated"}`,
              details: {
                disputeId: dispute.id,
                disputeStatus: dispute.status,
                previousAlertStatus: existingAlert.status,
                newAlertStatus: newStatus,
              },
            });
          }

          app.log.info(
            { type: event.type, disputeId: dispute.id },
            "Dispute status update",
          );
          break;
        }

        case "charge.refunded": {
          const chargeObj = event.data.object as {
            id: string;
            refunds?: {
              data: Array<{
                id: string;
                metadata?: Record<string, string>;
              }>;
            };
          };

          // Track Qarta-initiated refunds
          const qartaRefund = chargeObj.refunds?.data?.find(
            (r) => r.metadata?.source === "qarta_auto_refund",
          );

          if (qartaRefund) {
            const action = await db.query.refundActions.findFirst({
              where: eq(schema.refundActions.stripeRefundId, qartaRefund.id),
            });

            if (action && action.status === "pending") {
              await db
                .update(schema.refundActions)
                .set({ status: "executed", executedAt: new Date() })
                .where(eq(schema.refundActions.id, action.id));
            }
          }

          app.log.info(
            { type: event.type, chargeId: chargeObj.id },
            "Charge refunded tracked",
          );
          break;
        }
      }
    } catch (err) {
      app.log.error(
        { err, eventType: event.type },
        "Error processing webhook",
      );
    }

    // Mark webhook event as processed
    await db
      .update(schema.webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.webhookEvents.id, webhookEventId));

    return reply.status(200).send({ received: true, processed: true });
  });
}

// ---------- Pipeline: policy evaluation + action execution ----------

/**
 * Convert DB policy row to the Policy type expected by the policy engine.
 */
function dbPolicyToPolicy(
  row: typeof schema.policies.$inferSelect,
): Policy {
  return {
    id: row.id,
    merchantId: row.merchantId,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    conditions: row.conditions as PolicyCondition[],
    action: {
      type: row.actionType,
      cancelSubscription: row.cancelSubscription,
    },
    safetyRails: {
      maxRefundsPerDay: row.maxRefundsPerDay,
      maxRefundsPerCustomer: row.maxRefundsPerCustomer,
      maxRefundAmount: row.maxRefundAmount,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Build an Alert object from a ParsedAlert + DB context for policy engine evaluation.
 */
function buildAlertForEngine(
  alertId: string,
  merchantId: string,
  parsed: ParsedAlert,
): Alert {
  return {
    id: alertId,
    merchantId,
    source: parsed.source,
    status: "new",
    stripeChargeId: parsed.stripeChargeId,
    stripePaymentIntentId: parsed.stripePaymentIntentId,
    stripeDisputeId: parsed.stripeDisputeId,
    stripeEfwId: parsed.stripeEfwId,
    amount: parsed.amount,
    currency: parsed.currency,
    reasonCategory: parsed.reasonCategory,
    reasonRaw: parsed.reasonRaw,
    isActionable: parsed.isActionable,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check safety rails before executing an auto-refund.
 */
async function checkSafetyRails(
  merchantId: string,
  alertAmount: number,
  customerId: string | undefined,
  safetyRails: SafetyRails,
): Promise<{ passed: boolean; reason?: string }> {
  // 1. Amount cap
  if (alertAmount > safetyRails.maxRefundAmount) {
    return {
      passed: false,
      reason: `amount_exceeds_cap:${alertAmount}>${safetyRails.maxRefundAmount}`,
    };
  }

  // 2. Daily refund count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [dailyResult] = await db
    .select({ value: count() })
    .from(schema.refundActions)
    .where(
      and(
        eq(schema.refundActions.merchantId, merchantId),
        eq(schema.refundActions.status, "executed"),
        gte(schema.refundActions.createdAt, todayStart),
      ),
    );

  const dailyCount = dailyResult?.value ?? 0;
  if (dailyCount >= safetyRails.maxRefundsPerDay) {
    return {
      passed: false,
      reason: `daily_limit_reached:${dailyCount}>=${safetyRails.maxRefundsPerDay}`,
    };
  }

  // 3. Per-customer refund count
  if (customerId) {
    const [customerResult] = await db
      .select({ value: count() })
      .from(schema.refundActions)
      .innerJoin(
        schema.alerts,
        eq(schema.refundActions.alertId, schema.alerts.id),
      )
      .where(
        and(
          eq(schema.refundActions.merchantId, merchantId),
          eq(schema.alerts.customerId, customerId),
          eq(schema.refundActions.status, "executed"),
        ),
      );

    const customerCount = customerResult?.value ?? 0;
    if (customerCount >= safetyRails.maxRefundsPerCustomer) {
      return {
        passed: false,
        reason: `customer_limit_reached:${customerCount}>=${safetyRails.maxRefundsPerCustomer}`,
      };
    }
  }

  return { passed: true };
}

/**
 * Core pipeline: evaluate alert against policies, check safety rails, execute action.
 */
async function processAlertWithPolicies(
  log: FastifyBaseLogger,
  merchant: typeof schema.merchants.$inferSelect,
  alertId: string,
  parsed: ParsedAlert,
  stripeAccountId?: string,
): Promise<void> {
  // Set alert to evaluating
  await db
    .update(schema.alerts)
    .set({ status: "evaluating", updatedAt: new Date() })
    .where(eq(schema.alerts.id, alertId));

  // Fetch merchant policies
  const dbPolicies = await db.query.policies.findMany({
    where: eq(schema.policies.merchantId, merchant.id),
  });

  const policies = dbPolicies.map(dbPolicyToPolicy);
  const alert = buildAlertForEngine(alertId, merchant.id, parsed);

  // Evaluate against policy engine
  const decision: PolicyDecision = evaluateAlert(alert, policies);

  log.info(
    { alertId, matched: decision.matched, reason: decision.reason },
    "Policy engine decision",
  );

  if (!decision.matched || !decision.action) {
    // No policy matched → escalate for manual review
    await db
      .update(schema.alerts)
      .set({ status: "escalated", updatedAt: new Date() })
      .where(eq(schema.alerts.id, alertId));

    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId: merchant.id,
      alertId,
      actor: "system",
      event: "alert_escalated",
      details: { reason: decision.reason },
    });

    return;
  }

  const { action } = decision;
  const safetyRails = decision.policy!.safetyRails;

  switch (action.type) {
    case "auto_refund": {
      // Fetch customerId from the alert in DB
      const dbAlert = await db.query.alerts.findFirst({
        where: eq(schema.alerts.id, alertId),
      });

      // Check safety rails
      const railsCheck = await checkSafetyRails(
        merchant.id,
        parsed.amount,
        dbAlert?.customerId ?? undefined,
        safetyRails,
      );

      if (!railsCheck.passed) {
        // Safety rails blocked → escalate
        log.info(
          { alertId, reason: railsCheck.reason },
          "Safety rails blocked auto-refund",
        );

        await db.insert(schema.refundActions).values({
          id: nanoid(),
          alertId,
          merchantId: merchant.id,
          policyId: decision.policy!.id,
          status: "skipped",
          refundAmount: parsed.amount,
          currency: parsed.currency,
          stripeChargeId: parsed.stripeChargeId,
          failureReason: railsCheck.reason,
        });

        await db
          .update(schema.alerts)
          .set({ status: "escalated", updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));

        await db.insert(schema.auditLog).values({
          id: nanoid(),
          merchantId: merchant.id,
          alertId,
          actor: "system",
          event: "auto_refund_blocked_by_safety_rails",
          details: {
            policyId: decision.policy!.id,
            policyName: decision.policy!.name,
            reason: railsCheck.reason,
          },
        });

        return;
      }

      // Execute refund
      if (!config.STRIPE_SECRET_KEY) {
        log.error("Cannot execute refund: STRIPE_SECRET_KEY not configured");
        await db
          .update(schema.alerts)
          .set({ status: "escalated", updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));
        return;
      }

      const refundResult = await executeRefund(
        config.STRIPE_SECRET_KEY,
        {
          stripeChargeId: parsed.stripeChargeId,
          amount: parsed.amount,
          reason: parsed.reasonCategory,
        },
        stripeAccountId,
      );

      const actionId = nanoid();
      await db.insert(schema.refundActions).values({
        id: actionId,
        alertId,
        merchantId: merchant.id,
        policyId: decision.policy!.id,
        status: refundResult.success ? "executed" : "failed",
        refundAmount: parsed.amount,
        currency: parsed.currency,
        stripeRefundId: refundResult.stripeRefundId,
        stripeChargeId: parsed.stripeChargeId,
        failureReason: refundResult.failureReason,
        executedAt: refundResult.success ? new Date() : undefined,
      });

      const newStatus: AlertStatus = refundResult.success
        ? "auto_refunded"
        : "escalated";

      await db
        .update(schema.alerts)
        .set({
          status: newStatus,
          resolvedAt: refundResult.success ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.alerts.id, alertId));

      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId: merchant.id,
        alertId,
        actionId,
        actor: "system",
        event: refundResult.success
          ? "auto_refund_executed"
          : "auto_refund_failed",
        details: {
          policyId: decision.policy!.id,
          policyName: decision.policy!.name,
          amount: parsed.amount,
          currency: parsed.currency,
          stripeRefundId: refundResult.stripeRefundId,
          failureReason: refundResult.failureReason,
        },
      });

      log.info(
        {
          alertId,
          actionId,
          success: refundResult.success,
          stripeRefundId: refundResult.stripeRefundId,
        },
        "Auto-refund result",
      );
      break;
    }

    case "escalate": {
      await db
        .update(schema.alerts)
        .set({ status: "escalated", updatedAt: new Date() })
        .where(eq(schema.alerts.id, alertId));

      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId: merchant.id,
        alertId,
        actor: "system",
        event: "alert_escalated_by_policy",
        details: {
          policyId: decision.policy!.id,
          policyName: decision.policy!.name,
        },
      });
      break;
    }

    case "dismiss": {
      await db
        .update(schema.alerts)
        .set({
          status: "dismissed",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.alerts.id, alertId));

      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId: merchant.id,
        alertId,
        actor: "system",
        event: "alert_dismissed_by_policy",
        details: {
          policyId: decision.policy!.id,
          policyName: decision.policy!.name,
        },
      });
      break;
    }
  }
}
