import type { FastifyInstance } from "fastify";

export async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook handler
  app.post("/stripe", async (request, reply) => {
    // TODO: Verify Stripe webhook signature
    // TODO: Process webhook events (payment_intent.succeeded, charge.dispute.created, etc.)

    app.log.info("Received Stripe webhook");

    return reply.status(200).send({ received: true });
  });

  // Coinbase Commerce webhook handler
  app.post("/coinbase", async (request, reply) => {
    // TODO: Verify Coinbase Commerce webhook signature
    // TODO: Process webhook events (charge:confirmed, charge:failed, etc.)

    app.log.info("Received Coinbase Commerce webhook");

    return reply.status(200).send({ received: true });
  });
}
