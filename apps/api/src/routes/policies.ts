import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiResponse, Policy, PaginatedResponse } from "@qarta/shared";

const conditionSchema = z.object({
  field: z.enum([
    "amount",
    "reason_category",
    "source",
    "card_brand",
    "is_actionable",
  ]),
  operator: z.enum(["lt", "lte", "gt", "gte", "eq", "in"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const createPolicySchema = z.object({
  name: z.string().min(1).max(100),
  priority: z.number().int().min(1).max(1000),
  conditions: z.array(conditionSchema).min(1),
  action: z.object({
    type: z.enum(["auto_refund", "escalate", "dismiss"]),
    cancelSubscription: z.boolean().optional(),
  }),
  safetyRails: z.object({
    maxRefundsPerDay: z.number().int().min(1).max(1000),
    maxRefundsPerCustomer: z.number().int().min(1).max(100),
    maxRefundAmount: z.number().int().min(100).max(10000000), // $1 to $100k in cents
  }),
});

/**
 * Policy routes — create, list, and manage auto-refund policies.
 */
export async function policyRoutes(app: FastifyInstance) {
  // List policies for a merchant
  app.get("/", async (_request, reply) => {
    // TODO: Authenticate merchant via API key
    // TODO: Fetch policies from database

    const response: PaginatedResponse<Policy> = {
      success: true,
      data: [],
      meta: { total: 0, page: 1, perPage: 50 },
    };

    return reply.send(response);
  });

  // Create a new policy
  app.post<{
    Body: z.infer<typeof createPolicySchema>;
  }>("/", async (request, reply) => {
    const parsed = createPolicySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid policy configuration",
          details: parsed.error.format(),
        },
      });
    }

    // TODO: Authenticate merchant
    // TODO: Create policy in database
    // TODO: Write audit log

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: `pol_${Date.now()}` },
    };

    return reply.status(201).send(response);
  });

  // Delete a policy
  app.delete<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const { id } = request.params;

    // TODO: Authenticate merchant
    // TODO: Verify policy belongs to merchant
    // TODO: Soft-delete or hard-delete policy
    // TODO: Write audit log

    return reply.send({
      success: true,
      data: { id, deleted: true },
    });
  });
}
