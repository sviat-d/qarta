import type { FastifyInstance } from "fastify";
import { STRIPE_EVENTS_OF_INTEREST } from "@qarta/shared";
import {
  parseEarlyFraudWarning,
  parseDispute,
} from "../services/alert-processor.js";

export async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook handler — ingests EFW and dispute events
  app.post("/stripe", async (request, reply) => {
    // TODO: Verify Stripe webhook signature using STRIPE_WEBHOOK_SECRET
    // const sig = request.headers["stripe-signature"];

    const event = request.body as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

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

    // TODO: Check idempotency — skip if stripe_event_id already exists in webhook_events table
    // TODO: Store raw event in webhook_events table

    try {
      switch (event.type) {
        case "radar.early_fraud_warning.created": {
          const efw = event.data.object as {
            id: string;
            actionable: boolean;
            charge: string;
            payment_intent?: string;
          };

          // TODO: Look up charge to get amount/currency
          const parsed = parseEarlyFraudWarning(efw, 0, "USD");
          app.log.info(
            {
              efwId: efw.id,
              charge: efw.charge,
              actionable: efw.actionable,
            },
            "Processed EFW alert",
          );

          // TODO: Create alert in database
          // TODO: Run through policy engine
          // TODO: Execute action (auto-refund / escalate / dismiss)
          // TODO: Write audit log
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
          app.log.info(
            {
              disputeId: dispute.id,
              charge: dispute.charge,
              reason: dispute.reason,
            },
            "Processed dispute alert",
          );

          // TODO: Create alert in database
          // TODO: Run through policy engine
          // TODO: Execute action
          // TODO: Write audit log
          break;
        }

        case "charge.dispute.updated":
        case "charge.dispute.closed": {
          app.log.info(
            { type: event.type },
            "Dispute status update — updating outcomes",
          );
          // TODO: Update alert status based on dispute resolution
          break;
        }

        case "charge.refunded": {
          app.log.info(
            { type: event.type },
            "Charge refunded — tracking for outcomes",
          );
          // TODO: Track refund for outcome metrics
          break;
        }
      }
    } catch (err) {
      app.log.error(
        { err, eventType: event.type },
        "Error processing webhook",
      );
    }

    return reply.status(200).send({ received: true, processed: true });
  });
}
