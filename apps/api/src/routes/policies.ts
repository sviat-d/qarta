import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ApiResponse, Policy, PaginatedResponse, PolicyCondition } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

const conditionSchema = z.object({
  field: z.enum([
    "amount",
    "reason_category",
    "source",
    "card_brand",
    "is_actionable",
  ]),
  operator: z.enum(["lt", "lte", "gt", "gte", "eq", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
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
  // All policy routes require authentication
  app.addHook("preHandler", authenticateApiKey);

  // List policies for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    const dbPolicies = await db.query.policies.findMany({
      where: eq(schema.policies.merchantId, merchant.id),
      orderBy: (policies, { asc }) => [asc(policies.priority)],
    });

    const response: PaginatedResponse<Policy> = {
      success: true,
      data: dbPolicies.map(dbPolicyToPolicy),
      meta: { total: dbPolicies.length, page: 1, perPage: 50 },
    };

    return reply.send(response);
  });

  // Create a new policy
  app.post("/", async (request, reply) => {
    const merchant = request.merchant!;
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

    const { name, priority, conditions, action, safetyRails } = parsed.data;
    const policyId = nanoid();

    await db.insert(schema.policies).values({
      id: policyId,
      merchantId: merchant.id,
      name,
      priority,
      conditions: conditions as PolicyCondition[],
      actionType: action.type,
      cancelSubscription: action.cancelSubscription ?? false,
      maxRefundsPerDay: safetyRails.maxRefundsPerDay,
      maxRefundsPerCustomer: safetyRails.maxRefundsPerCustomer,
      maxRefundAmount: safetyRails.maxRefundAmount,
    });

    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId: merchant.id,
      actor: "user",
      event: "policy_created",
      details: { policyId, name, priority, actionType: action.type },
    });

    app.log.info(
      { merchantId: merchant.id, policyId, name },
      "Policy created",
    );

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: policyId },
    };

    return reply.status(201).send(response);
  });

  // Delete a policy
  app.delete<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    // Verify policy belongs to merchant
    const policy = await db.query.policies.findFirst({
      where: and(
        eq(schema.policies.id, id),
        eq(schema.policies.merchantId, merchant.id),
      ),
    });

    if (!policy) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Policy not found" },
      });
    }

    await db
      .delete(schema.policies)
      .where(eq(schema.policies.id, id));

    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId: merchant.id,
      actor: "user",
      event: "policy_deleted",
      details: { policyId: id, name: policy.name },
    });

    app.log.info(
      { merchantId: merchant.id, policyId: id },
      "Policy deleted",
    );

    return reply.send({
      success: true,
      data: { id, deleted: true },
    });
  });
}

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
