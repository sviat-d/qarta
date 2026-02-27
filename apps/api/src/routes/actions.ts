import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import type { PaginatedResponse, RefundAction } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "executed", "failed", "skipped"]).optional(),
});

/**
 * Actions routes — list refund actions taken by the system.
 */
export async function actionRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticateApiKey);

  // List refund actions
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;
    const query = listQuerySchema.parse(request.query);

    const conditions = [eq(schema.refundActions.merchantId, merchant.id)];
    if (query.status) {
      conditions.push(eq(schema.refundActions.status, query.status));
    }

    const where = conditions.length === 1 ? conditions[0]! : and(...conditions)!;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(schema.refundActions)
        .where(where)
        .orderBy(desc(schema.refundActions.createdAt))
        .limit(query.perPage)
        .offset((query.page - 1) * query.perPage),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.refundActions)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    const response: PaginatedResponse<RefundAction> = {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        alertId: row.alertId,
        merchantId: row.merchantId,
        policyId: row.policyId ?? undefined,
        status: row.status,
        refundAmount: row.refundAmount,
        currency: row.currency,
        stripeRefundId: row.stripeRefundId ?? undefined,
        stripeChargeId: row.stripeChargeId,
        canceledSubscription: row.canceledSubscription,
        failureReason: row.failureReason ?? undefined,
        executedAt: row.executedAt ?? undefined,
        createdAt: row.createdAt,
      })),
      meta: { total, page: query.page, perPage: query.perPage },
    };

    return reply.send(response);
  });
}
