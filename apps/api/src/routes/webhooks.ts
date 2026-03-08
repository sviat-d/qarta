import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { STRIPE_EVENTS_OF_INTEREST } from "@qarta/shared";
import type { Alert, Policy, PolicyCondition, PolicyAction, SafetyRails } from "@qarta/shared";
import {
  parseEarlyFraudWarning,
  parseDispute,
  type ParsedAlert,
} from "../services/alert-processor.js";
import { verifyWebhookSignature, verifyConnectWebhookSignature, getChargeDetails } from "../services/stripe.js";
import { evaluateAlert } from "../services/policy-engine.js";
import { executeRefund } from "../services/refund-executor.js";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";
import { sendNotification } from "../services/notifier.js";
import { enqueueWebhook } from "../services/webhook-queue.js";
import { handleBillingEvent } from "./billing.js";

export async function webhookRoutes(app: FastifyInstance) {
  // Register raw body parser for signature verification
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post("/stripe", async (request, reply) => {
    const rawBody = request.body as string;

    // 1. Verify Stripe webhook signature
    const sig = request.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      return reply.status(400).send({
        success: false,
        error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header" },
      });
    }

    let event: {
      id: string;
      type: string;
      account?: string;
      data: { object: Record<string, unknown> };
    };

    if (config.STRIPE_WEBHOOK_SECRET) {
      const verified = verifyWebhookSignature(rawBody, sig);
      if (!verified) {
        app.log.warn("Webhook signature verification failed");
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed" },
        });
      }
      event = verified as unknown as typeof event;
    } else {
      // Dev mode: parse without verification
      event = JSON.parse(rawBody);
    }

    app.log.info({ type: event.type, id: event.id }, "Received Stripe webhook");

    // Skip events we don't care about
    if (
      !STRIPE_EVENTS_OF_INTEREST.includes(
        event.type as (typeof STRIPE_EVENTS_OF_INTEREST)[number],
      )
    ) {
      return reply.status(200).send({ received: true, processed: false });
    }

    // 2. Idempotency check — skip if already successfully processed
    const existing = await db.query.webhookEvents.findFirst({
      where: eq(schema.webhookEvents.stripeEventId, event.id),
    });
    if (existing?.processedAt) {
      app.log.info({ eventId: event.id }, "Duplicate webhook event, skipping");
      return reply.status(200).send({ received: true, processed: false, duplicate: true });
    }

    // 3. Store raw event (or reuse existing if retrying)
    let webhookEventId: string;
    if (existing) {
      webhookEventId = existing.id;
      app.log.info({ eventId: event.id }, "Retrying previously failed webhook event");
    } else {
      webhookEventId = `whe_${nanoid()}`;
      await db.insert(schema.webhookEvents).values({
        id: webhookEventId,
        stripeEventId: event.id,
        type: event.type,
        payload: event.data.object,
      });
    }

    // 4. Enqueue for async processing via BullMQ
    try {
      await enqueueWebhook({
        webhookEventId,
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data.object,
        account: event.account,
        isConnect: false,
      });
      app.log.info({ eventId: event.id }, "Webhook enqueued for processing");
    } catch (err) {
      // Queue unavailable — fall back to sync processing
      app.log.warn({ err }, "Queue unavailable, processing webhook synchronously");
      await processWebhookSync(app, webhookEventId, event, false);
    }

    return reply.status(200).send({ received: true, queued: true });
  });

  // ── Connect webhook endpoint (for connected Stripe accounts) ──
  app.post("/stripe/connect", async (request, reply) => {
    const rawBody = request.body as string;

    const sig = request.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      return reply.status(400).send({
        success: false,
        error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header" },
      });
    }

    let event: {
      id: string;
      type: string;
      account?: string;
      data: { object: Record<string, unknown> };
    };

    if (config.STRIPE_CONNECT_WEBHOOK_SECRET) {
      const verified = verifyConnectWebhookSignature(rawBody, sig);
      if (!verified) {
        app.log.warn("Connect webhook signature verification failed");
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed" },
        });
      }
      event = verified as unknown as typeof event;
    } else {
      event = JSON.parse(rawBody);
    }

    app.log.info({ type: event.type, id: event.id, account: event.account }, "Received Stripe Connect webhook");

    if (
      !STRIPE_EVENTS_OF_INTEREST.includes(
        event.type as (typeof STRIPE_EVENTS_OF_INTEREST)[number],
      )
    ) {
      return reply.status(200).send({ received: true, processed: false });
    }

    // Idempotency check — skip if already successfully processed
    const existing = await db.query.webhookEvents.findFirst({
      where: eq(schema.webhookEvents.stripeEventId, event.id),
    });
    if (existing?.processedAt) {
      app.log.info({ eventId: event.id }, "Duplicate webhook event, skipping");
      return reply.status(200).send({ received: true, processed: false, duplicate: true });
    }

    // Store raw event (or reuse existing if retrying)
    let webhookEventId: string;
    if (existing) {
      webhookEventId = existing.id;
      app.log.info({ eventId: event.id }, "Retrying previously failed Connect webhook event");
    } else {
      webhookEventId = `whe_${nanoid()}`;
      await db.insert(schema.webhookEvents).values({
        id: webhookEventId,
        stripeEventId: event.id,
        type: event.type,
        payload: event.data.object,
      });
    }

    // Enqueue for async processing via BullMQ
    try {
      await enqueueWebhook({
        webhookEventId,
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data.object,
        account: event.account,
        isConnect: true,
      });
      app.log.info({ eventId: event.id }, "Connect webhook enqueued for processing");
    } catch (err) {
      app.log.warn({ err }, "Queue unavailable, processing Connect webhook synchronously");
      await processWebhookSync(app, webhookEventId, event, true);
    }

    return reply.status(200).send({ received: true, queued: true });
  });
}

/**
 * Synchronous fallback when BullMQ is unavailable.
 */
async function processWebhookSync(
  app: FastifyInstance,
  webhookEventId: string,
  event: { id: string; type: string; account?: string; data: { object: Record<string, unknown> } },
  isConnect: boolean,
) {
  let merchantId: string | null = null;
  const stripeAccountId = event.account;

  if (stripeAccountId) {
    const connection = await db.query.stripeConnections.findFirst({
      where: eq(schema.stripeConnections.stripeAccountId, stripeAccountId),
    });
    if (connection) {
      merchantId = connection.merchantId;
    }
  }

  if (!merchantId) {
    const firstMerchant = await db.query.merchants.findFirst();
    merchantId = firstMerchant?.id ?? null;
  }

  if (!merchantId) {
    app.log.warn({ eventId: event.id }, "No merchant found for webhook event");
    await db.update(schema.webhookEvents).set({ processedAt: new Date() }).where(eq(schema.webhookEvents.id, webhookEventId));
    return;
  }

  try {
    switch (event.type) {
      case "radar.early_fraud_warning.created": {
        const efw = event.data.object as { id: string; actionable: boolean; charge: string; payment_intent?: string; created: number };
        const charge = await getChargeDetails(efw.charge, stripeAccountId);
        const parsed = parseEarlyFraudWarning(efw, charge?.amount ?? 0, charge?.currency ?? "USD");
        await processAlertPipeline(merchantId, parsed, charge, stripeAccountId);
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as { id: string; charge: string; payment_intent?: string; amount: number; currency: string; reason: string; status: string };
        const parsed = parseDispute(dispute);
        const charge = await getChargeDetails(dispute.charge, stripeAccountId);
        await processAlertPipeline(merchantId, parsed, charge, stripeAccountId);
        break;
      }
      case "charge.dispute.updated":
      case "charge.dispute.closed": {
        const dispute = event.data.object as { id: string; status: string };
        const alert = await db.query.alerts.findFirst({ where: eq(schema.alerts.stripeDisputeId, dispute.id) });
        if (alert) {
          const newStatus = dispute.status === "won" ? "dismissed" as const : "expired" as const;
          await db.update(schema.alerts).set({ status: newStatus, updatedAt: new Date() }).where(eq(schema.alerts.id, alert.id));
          await writeAuditLog(merchantId, alert.id, undefined, "system", `dispute_${dispute.status}`, { stripeDisputeId: dispute.id, disputeStatus: dispute.status });
        }
        break;
      }
      case "charge.refunded":
        app.log.info({ type: event.type }, "External refund tracked");
        break;
      case "checkout.session.completed":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleBillingEvent(event.type, event.data.object);
        break;
    }

    await db.update(schema.webhookEvents).set({ processedAt: new Date() }).where(eq(schema.webhookEvents.id, webhookEventId));
  } catch (err) {
    app.log.error({ err, eventType: event.type }, "Error processing webhook synchronously");
  }
}

/**
 * Core pipeline: Create Alert → Evaluate Policy → Execute Action → Audit Log.
 * Exported so the BullMQ worker can call it.
 */
export async function processAlertPipeline(
  merchantId: string,
  parsed: ParsedAlert,
  chargeDetails: Awaited<ReturnType<typeof getChargeDetails>>,
  stripeAccountId?: string,
) {
  // 1. Create alert in database
  const alertId = `alt_${nanoid()}`;
  await db.insert(schema.alerts).values({
    id: alertId,
    merchantId,
    source: parsed.source,
    status: "evaluating",
    stripeChargeId: parsed.stripeChargeId,
    stripePaymentIntentId: parsed.stripePaymentIntentId ?? chargeDetails?.paymentIntent,
    stripeDisputeId: parsed.stripeDisputeId,
    stripeEfwId: parsed.stripeEfwId,
    amount: parsed.amount,
    currency: parsed.currency,
    reasonCategory: parsed.reasonCategory,
    reasonRaw: parsed.reasonRaw,
    customerEmail: chargeDetails?.customerEmail,
    customerId: chargeDetails?.customerId,
    cardLast4: chargeDetails?.cardLast4,
    cardBrand: chargeDetails?.cardBrand,
    isActionable: parsed.isActionable,
  });

  await writeAuditLog(merchantId, alertId, undefined, "system", "alert_created", {
    source: parsed.source,
    amount: parsed.amount,
    currency: parsed.currency,
  });

  console.log("Alert created", { alertId, source: parsed.source });

  // Notify: new alert
  sendNotification({
    type: "new_alert",
    merchantId,
    alertId,
    amount: parsed.amount,
    currency: parsed.currency,
    source: parsed.source,
    reasonCategory: parsed.reasonCategory,
    customerEmail: chargeDetails?.customerEmail ?? undefined,
  });

  // 2. Fetch merchant policies and evaluate
  const dbPolicies = await db.query.policies.findMany({
    where: eq(schema.policies.merchantId, merchantId),
  });

  // Map DB policies to domain type for the policy engine
  const domainPolicies: Policy[] = dbPolicies.map((p) => ({
    id: p.id,
    merchantId: p.merchantId,
    name: p.name,
    enabled: p.enabled,
    priority: p.priority,
    conditions: p.conditions as PolicyCondition[],
    action: {
      type: p.actionType,
      cancelSubscription: p.cancelSubscription,
    } as PolicyAction,
    safetyRails: {
      maxRefundsPerDay: p.maxRefundsPerDay,
      maxRefundsPerCustomer: p.maxRefundsPerCustomer,
      maxRefundAmount: p.maxRefundAmount,
    } as SafetyRails,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const alertForEngine: Alert = {
    id: alertId,
    merchantId,
    source: parsed.source,
    status: "evaluating",
    stripeChargeId: parsed.stripeChargeId,
    stripePaymentIntentId: parsed.stripePaymentIntentId,
    stripeDisputeId: parsed.stripeDisputeId,
    stripeEfwId: parsed.stripeEfwId,
    amount: parsed.amount,
    currency: parsed.currency,
    reasonCategory: parsed.reasonCategory,
    reasonRaw: parsed.reasonRaw,
    customerEmail: chargeDetails?.customerEmail,
    customerId: chargeDetails?.customerId,
    cardLast4: chargeDetails?.cardLast4,
    cardBrand: chargeDetails?.cardBrand,
    isActionable: parsed.isActionable,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const decision = evaluateAlert(alertForEngine, domainPolicies);

  console.log("Policy evaluation complete", { alertId, matched: decision.matched, reason: decision.reason });

  await writeAuditLog(merchantId, alertId, undefined, "system", "policy_evaluated", {
    matched: decision.matched,
    policyId: decision.policy?.id,
    reason: decision.reason,
  });

  // 3. Execute action based on decision
  if (!decision.matched || !decision.action) {
    // No policy matched — escalate for manual review
    await db
      .update(schema.alerts)
      .set({ status: "escalated", updatedAt: new Date() })
      .where(eq(schema.alerts.id, alertId));

    await writeAuditLog(merchantId, alertId, undefined, "system", "alert_escalated", {
      reason: decision.reason,
    });

    sendNotification({
      type: "escalated",
      merchantId,
      alertId,
      amount: parsed.amount,
      currency: parsed.currency,
      source: parsed.source,
      reasonCategory: parsed.reasonCategory,
      customerEmail: chargeDetails?.customerEmail ?? undefined,
    });
    return;
  }

  switch (decision.action.type) {
    case "auto_refund": {
      if (!parsed.stripeChargeId) {
        await db
          .update(schema.alerts)
          .set({ status: "escalated", updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));
        await writeAuditLog(merchantId, alertId, undefined, "system", "refund_skipped", {
          reason: "missing_charge_id",
        });
        return;
      }

      // Safety rails check
      const policy = decision.policy!;
      const safetyCheck = await checkSafetyRails(
        merchantId,
        parsed.amount,
        chargeDetails?.customerId,
        policy.safetyRails,
      );

      if (!safetyCheck.allowed) {
        await db
          .update(schema.alerts)
          .set({ status: "escalated", updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));

        await writeAuditLog(merchantId, alertId, undefined, "system", "safety_rails_triggered", {
          reason: safetyCheck.reason,
          policyId: policy.id,
        });

        console.warn("Safety rails blocked auto-refund", { alertId, reason: safetyCheck.reason });
        return;
      }

      // Execute refund
      const actionId = `act_${nanoid()}`;
      await db.insert(schema.refundActions).values({
        id: actionId,
        alertId,
        merchantId,
        policyId: policy.id,
        status: "pending",
        refundAmount: parsed.amount,
        currency: parsed.currency,
        stripeChargeId: parsed.stripeChargeId,
        canceledSubscription: false,
      });

      const result = await executeRefund({
        stripeChargeId: parsed.stripeChargeId,
        amount: parsed.amount,
        reason: parsed.reasonRaw,
      }, stripeAccountId);

      if (result.success) {
        await db
          .update(schema.refundActions)
          .set({
            status: "executed",
            stripeRefundId: result.stripeRefundId,
            executedAt: new Date(),
          })
          .where(eq(schema.refundActions.id, actionId));

        await db
          .update(schema.alerts)
          .set({ status: "auto_refunded", resolvedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));

        await writeAuditLog(merchantId, alertId, actionId, "system", "auto_refund_executed", {
          refundAmount: parsed.amount,
          stripeRefundId: result.stripeRefundId,
          policyId: policy.id,
        });

        console.log("Auto-refund executed", { alertId, actionId, refundId: result.stripeRefundId });

        sendNotification({
          type: "auto_refund",
          merchantId,
          alertId,
          amount: parsed.amount,
          currency: parsed.currency,
          source: parsed.source,
          reasonCategory: parsed.reasonCategory,
          customerEmail: chargeDetails?.customerEmail ?? undefined,
          policyName: policy.name,
          refundId: result.stripeRefundId,
        });
      } else {
        await db
          .update(schema.refundActions)
          .set({ status: "failed", failureReason: result.failureReason })
          .where(eq(schema.refundActions.id, actionId));

        await db
          .update(schema.alerts)
          .set({ status: "escalated", updatedAt: new Date() })
          .where(eq(schema.alerts.id, alertId));

        await writeAuditLog(merchantId, alertId, actionId, "system", "auto_refund_failed", {
          reason: result.failureReason,
          policyId: policy.id,
        });

        console.error("Auto-refund failed, escalated", { alertId, reason: result.failureReason });
      }
      break;
    }

    case "escalate": {
      await db
        .update(schema.alerts)
        .set({ status: "escalated", updatedAt: new Date() })
        .where(eq(schema.alerts.id, alertId));

      await writeAuditLog(merchantId, alertId, undefined, "system", "alert_escalated", {
        policyId: decision.policy!.id,
        reason: "policy_action_escalate",
      });
      break;
    }

    case "dismiss": {
      await db
        .update(schema.alerts)
        .set({ status: "dismissed", resolvedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.alerts.id, alertId));

      await writeAuditLog(merchantId, alertId, undefined, "system", "alert_dismissed", {
        policyId: decision.policy!.id,
        reason: "policy_action_dismiss",
      });
      break;
    }
  }
}

/**
 * Check safety rails before executing an auto-refund.
 */
async function checkSafetyRails(
  merchantId: string,
  refundAmount: number,
  customerId: string | undefined,
  rails: SafetyRails,
): Promise<{ allowed: boolean; reason?: string }> {
  // Check amount cap
  if (refundAmount > rails.maxRefundAmount) {
    return { allowed: false, reason: `amount_exceeds_cap:${refundAmount}>${rails.maxRefundAmount}` };
  }

  // Check daily refund count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: dailyCount } = await db
    .select({ count: schema.refundActions.id })
    .from(schema.refundActions)
    .where(eq(schema.refundActions.merchantId, merchantId))
    .then((rows) => ({ count: rows.length }));

  // Simplified: count all actions for this merchant today
  // In production, filter by createdAt >= today
  if (dailyCount >= rails.maxRefundsPerDay) {
    return { allowed: false, reason: `daily_limit_reached:${dailyCount}>=${rails.maxRefundsPerDay}` };
  }

  // Check per-customer limit
  if (customerId) {
    const { count: customerCount } = await db
      .select({ count: schema.alerts.id })
      .from(schema.alerts)
      .where(eq(schema.alerts.customerId, customerId))
      .then((rows) => ({ count: rows.filter((r) => r.count).length }));

    if (customerCount >= rails.maxRefundsPerCustomer) {
      return { allowed: false, reason: `customer_limit_reached:${customerCount}>=${rails.maxRefundsPerCustomer}` };
    }
  }

  return { allowed: true };
}

/**
 * Write an entry to the audit log.
 */
async function writeAuditLog(
  merchantId: string,
  alertId: string | undefined,
  actionId: string | undefined,
  actor: "system" | "user",
  event: string,
  details?: Record<string, unknown>,
) {
  await db.insert(schema.auditLog).values({
    id: `aud_${nanoid()}`,
    merchantId,
    alertId,
    actionId,
    actor,
    event,
    details,
  });
}
