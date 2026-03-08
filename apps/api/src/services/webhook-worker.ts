import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { WebhookJobData } from "./webhook-queue.js";
import {
  parseEarlyFraudWarning,
  parseDispute,
} from "./alert-processor.js";
import { getChargeDetails } from "./stripe.js";
import { processAlertPipeline } from "../routes/webhooks.js";

/**
 * BullMQ job processor for webhook events.
 * This runs asynchronously after the webhook endpoint has returned 200.
 */
export async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const { webhookEventId, eventType, payload, account, isConnect } = job.data;

  // Resolve merchant
  let merchantId: string | null = null;
  const stripeAccountId = account;

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
    console.warn(`No merchant found for webhook event ${webhookEventId}`);
    await db
      .update(schema.webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.webhookEvents.id, webhookEventId));
    return;
  }

  // Process based on event type
  switch (eventType) {
    case "radar.early_fraud_warning.created": {
      const efw = payload as {
        id: string;
        actionable: boolean;
        charge: string;
        payment_intent?: string;
        created: number;
      };

      const charge = await getChargeDetails(efw.charge, stripeAccountId);
      const parsed = parseEarlyFraudWarning(
        efw,
        charge?.amount ?? 0,
        charge?.currency ?? "USD",
      );

      await processAlertPipeline(merchantId, parsed, charge, stripeAccountId);
      break;
    }

    case "charge.dispute.created": {
      const dispute = payload as {
        id: string;
        charge: string;
        payment_intent?: string;
        amount: number;
        currency: string;
        reason: string;
        status: string;
      };

      const parsed = parseDispute(dispute);
      const charge = await getChargeDetails(dispute.charge, stripeAccountId);

      await processAlertPipeline(merchantId, parsed, charge, stripeAccountId);
      break;
    }

    case "charge.dispute.updated":
    case "charge.dispute.closed": {
      const dispute = payload as { id: string; status: string };

      const alert = await db.query.alerts.findFirst({
        where: eq(schema.alerts.stripeDisputeId, dispute.id),
      });

      if (alert) {
        const newStatus = dispute.status === "won" ? "dismissed" as const : "expired" as const;
        await db
          .update(schema.alerts)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(schema.alerts.id, alert.id));
      }
      break;
    }

    case "charge.refunded": {
      console.log(`External refund tracked${isConnect ? " (Connect)" : ""}`);
      break;
    }

    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const { handleBillingEvent } = await import("../routes/billing.js");
      await handleBillingEvent(eventType, payload);
      break;
    }
  }

  // Mark as processed on success
  await db
    .update(schema.webhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(schema.webhookEvents.id, webhookEventId));
}
