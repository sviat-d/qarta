import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiResponse, CreatePaymentResponse } from "@qarta/shared";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  method: z.enum(["card", "crypto"]).optional().default("card"),
  customerId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function paymentRoutes(app: FastifyInstance) {
  // Create a payment
  app.post<{
    Body: z.infer<typeof createPaymentSchema>;
  }>("/", async (request, reply) => {
    const parsed = createPaymentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.format(),
        },
      });
    }

    const { amount, currency, method } = parsed.data;

    // TODO: Implement actual payment creation via PSP providers
    // This is the scaffold — routing logic, retry logic, and provider integration go here

    const response: ApiResponse<CreatePaymentResponse> = {
      success: true,
      data: {
        id: `pay_${Date.now()}`,
        status: "pending",
        provider: method === "crypto" ? "coinbase_commerce" : "stripe",
      },
    };

    return reply.status(201).send(response);
  });

  // Get payment by ID
  app.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const { id } = request.params;

    // TODO: Fetch from database
    return reply.send({
      success: true,
      data: {
        id,
        status: "pending",
        message: "Payment lookup not yet implemented",
      },
    });
  });

  // List payments
  app.get("/", async (_request, reply) => {
    // TODO: Implement with pagination
    return reply.send({
      success: true,
      data: [],
      meta: { total: 0, page: 1, perPage: 20 },
    });
  });
}
