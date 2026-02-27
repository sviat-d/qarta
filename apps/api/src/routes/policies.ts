import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ApiResponse, Policy, PolicyCondition, PolicyAction, SafetyRails, PaginatedResponse } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

const conditionSchema = z.object({
  field: z.enum(["amount", "reason_category", "source", "card_brand", "is_actionable"]),
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
    maxRefundAmount: z.number().int().min(100).max(10000000),
  }),
});

/**
 * Policy routes — create, list, and manage auto-refund policies.
 */
export async function policyRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticateApiKey);

  // List policies for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    const rows = await db
      .select()
      .from(schema.policies)
      .where(eq(schema.policies.merchantId, merchant.id))
      .orderBy(schema.policies.priority);

    const policies: Policy[] = rows.map(mapPolicyRow);

    const response: PaginatedResponse<Policy> = {
      success: true,
      data: policies,
      meta: { total: policies.length, page: 1, perPage: 50 },
    };

    return reply.send(response);
  });

  // Create a new policy
  app.post<{ Body: z.infer<typeof createPolicySchema> }>("/", async (request, reply) => {
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

    const data = parsed.data;
    const policyId = `pol_${nanoid()}`;

    await db.insert(schema.policies).values({
      id: policyId,
      merchantId: merchant.id,
      name: data.name,
      priority: data.priority,
      conditions: data.conditions,
      actionType: data.action.type,
      cancelSubscription: data.action.cancelSubscription ?? false,
      maxRefundsPerDay: data.safetyRails.maxRefundsPerDay,
      maxRefundsPerCustomer: data.safetyRails.maxRefundsPerCustomer,
      maxRefundAmount: data.safetyRails.maxRefundAmount,
    });

    // Audit log
    await db.insert(schema.auditLog).values({
      id: `aud_${nanoid()}`,
      merchantId: merchant.id,
      actor: "user",
      event: "policy_created",
      details: { policyId, name: data.name },
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: policyId },
    };

    return reply.status(201).send(response);
  });

  // Update a policy
  app.put<{
    Params: { id: string };
    Body: z.infer<typeof createPolicySchema>;
  }>("/:id", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const existing = await db.query.policies.findFirst({
      where: and(eq(schema.policies.id, id), eq(schema.policies.merchantId, merchant.id)),
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Policy not found" },
      });
    }

    const parsed = createPolicySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid policy", details: parsed.error.format() },
      });
    }

    const data = parsed.data;

    await db
      .update(schema.policies)
      .set({
        name: data.name,
        priority: data.priority,
        conditions: data.conditions,
        actionType: data.action.type,
        cancelSubscription: data.action.cancelSubscription ?? false,
        maxRefundsPerDay: data.safetyRails.maxRefundsPerDay,
        maxRefundsPerCustomer: data.safetyRails.maxRefundsPerCustomer,
        maxRefundAmount: data.safetyRails.maxRefundAmount,
        updatedAt: new Date(),
      })
      .where(eq(schema.policies.id, id));

    await db.insert(schema.auditLog).values({
      id: `aud_${nanoid()}`,
      merchantId: merchant.id,
      actor: "user",
      event: "policy_updated",
      details: { policyId: id, name: data.name },
    });

    return reply.send({ success: true, data: { id } });
  });

  // Toggle policy enabled/disabled
  app.patch<{
    Params: { id: string };
    Body: { enabled: boolean };
  }>("/:id/toggle", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const existing = await db.query.policies.findFirst({
      where: and(eq(schema.policies.id, id), eq(schema.policies.merchantId, merchant.id)),
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Policy not found" },
      });
    }

    const { enabled } = request.body;

    await db
      .update(schema.policies)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(schema.policies.id, id));

    return reply.send({ success: true, data: { id, enabled } });
  });

  // Delete a policy
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const existing = await db.query.policies.findFirst({
      where: and(eq(schema.policies.id, id), eq(schema.policies.merchantId, merchant.id)),
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Policy not found" },
      });
    }

    await db.delete(schema.policies).where(eq(schema.policies.id, id));

    await db.insert(schema.auditLog).values({
      id: `aud_${nanoid()}`,
      merchantId: merchant.id,
      actor: "user",
      event: "policy_deleted",
      details: { policyId: id, name: existing.name },
    });

    return reply.send({ success: true, data: { id, deleted: true } });
  });
}

/** Map a DB policy row to the domain Policy type */
function mapPolicyRow(row: typeof schema.policies.$inferSelect): Policy {
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
    } as PolicyAction,
    safetyRails: {
      maxRefundsPerDay: row.maxRefundsPerDay,
      maxRefundsPerCustomer: row.maxRefundsPerCustomer,
      maxRefundAmount: row.maxRefundAmount,
    } as SafetyRails,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
