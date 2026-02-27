import type { FastifyInstance } from "fastify";
import { authenticateApiKey } from "../middleware/auth.js";

/**
 * Auth routes — API key validation and merchant info.
 */
export async function authRoutes(app: FastifyInstance) {
  // Validate API key and return merchant info
  app.get("/me", { onRequest: authenticateApiKey }, async (request, reply) => {
    const merchant = request.merchant!;

    return reply.send({
      success: true,
      data: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        stripeAccountId: merchant.stripeAccountId,
      },
    });
  });
}
