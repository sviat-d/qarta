import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Alert, PaginatedResponse, ApiResponse } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { executeRefund } from "../services/refund-executor.js";
import { db, schema } from "../db/index.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["new", "evaluating", "auto_refunded", "escalated", "manually_resolved", "dismissed", "expired"])
    .optional(),
  source: z.enum(["stripe_efw", "stripe_dispute", "stripe_inquiry", "manual"]).optional(),
  search: z.string().optional(),
});

const resolveBodySchema = z.object({
  action: z.enum(["refund", "dismiss"]),
  note: z.string().max(500).optional(),
});

/**
 * Alert routes — view and manage pre-dispute alerts.
 */
export async function alertRoutes(app: FastifyInstance) {
  // Auth on all routes
  app.addHook("onRequest", authenticateApiKey);

  // List alerts for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;
    const query = listQuerySchema.parse(request.query);

    const conditions = [eq(schema.alerts.merchantId, merchant.id)];

    if (query.status) {
      conditions.push(eq(schema.alerts.status, query.status));
    }
    if (query.source) {
      conditions.push(eq(schema.alerts.source, query.source));
    }
    if (query.search) {
      conditions.push(
        ilike(schema.alerts.customerEmail, `%${query.search}%`),
      );
    }

    const where = conditions.length === 1 ? conditions[0]! : and(...conditions)!;

    const [alertRows, countResult] = await Promise.all([
      db
        .select()
        .from(schema.alerts)
        .where(where)
        .orderBy(desc(schema.alerts.createdAt))
        .limit(query.perPage)
        .offset((query.page - 1) * query.perPage),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.alerts)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    const response: PaginatedResponse<Alert> = {
      success: true,
      data: alertRows.map(mapAlertRow),
      meta: { total, page: query.page, perPage: query.perPage },
    };

    return reply.send(response);
  });

  // Get alert by ID
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const alert = await db.query.alerts.findFirst({
      where: and(
        eq(schema.alerts.id, id),
        eq(schema.alerts.merchantId, merchant.id),
      ),
    });

    if (!alert) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Alert not found" },
      });
    }

    // Also fetch related refund actions
    const actions = await db.query.refundActions.findMany({
      where: eq(schema.refundActions.alertId, id),
    });

    const response: ApiResponse<Alert & { actions: typeof actions }> = {
      success: true,
      data: { ...mapAlertRow(alert), actions },
    };

    return reply.send(response);
  });

  // Manually resolve an alert
  app.post<{
    Params: { id: string };
    Body: z.infer<typeof resolveBodySchema>;
  }>("/:id/resolve", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const parsed = resolveBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.format() },
      });
    }
    const body = parsed.data;

    const alert = await db.query.alerts.findFirst({
      where: and(
        eq(schema.alerts.id, id),
        eq(schema.alerts.merchantId, merchant.id),
      ),
    });

    if (!alert) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Alert not found" },
      });
    }

    if (!["new", "escalated"].includes(alert.status)) {
      return reply.status(409).send({
        success: false,
        error: { code: "CONFLICT", message: `Alert is already ${alert.status}, cannot resolve` },
      });
    }

    if (body.action === "refund") {
      if (!alert.stripeChargeId) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Cannot refund: missing charge ID" },
        });
      }

      // Get connected account ID for the merchant
      const connection = await db.query.stripeConnections.findFirst({
        where: eq(schema.stripeConnections.merchantId, merchant.id),
      });

      const actionId = `act_${nanoid()}`;
      await db.insert(schema.refundActions).values({
        id: actionId,
        alertId: id,
        merchantId: merchant.id,
        status: "pending",
        refundAmount: alert.amount,
        currency: alert.currency,
        stripeChargeId: alert.stripeChargeId,
        canceledSubscription: false,
      });

      const result = await executeRefund({
        stripeChargeId: alert.stripeChargeId,
        amount: alert.amount,
        reason: body.note ?? alert.reasonRaw ?? undefined,
      }, connection?.stripeAccountId);

      if (result.success) {
        await db
          .update(schema.refundActions)
          .set({ status: "executed", stripeRefundId: result.stripeRefundId, executedAt: new Date() })
          .where(eq(schema.refundActions.id, actionId));

        await db
          .update(schema.alerts)
          .set({ status: "manually_resolved", resolvedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.alerts.id, id));

        // Audit log
        await db.insert(schema.auditLog).values({
          id: `aud_${nanoid()}`,
          merchantId: merchant.id,
          alertId: id,
          actionId,
          actor: "user",
          event: "manual_refund",
          details: { note: body.note, refundId: result.stripeRefundId },
        });

        return reply.send({ success: true, data: { id, status: "manually_resolved", refundId: result.stripeRefundId } });
      } else {
        await db
          .update(schema.refundActions)
          .set({ status: "failed", failureReason: result.failureReason })
          .where(eq(schema.refundActions.id, actionId));

        return reply.status(500).send({
          success: false,
          error: { code: "REFUND_FAILED", message: result.failureReason ?? "Refund failed" },
        });
      }
    } else {
      // Dismiss
      await db
        .update(schema.alerts)
        .set({ status: "dismissed", resolvedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.alerts.id, id));

      await db.insert(schema.auditLog).values({
        id: `aud_${nanoid()}`,
        merchantId: merchant.id,
        alertId: id,
        actor: "user",
        event: "manual_dismiss",
        details: { note: body.note },
      });

      return reply.send({ success: true, data: { id, status: "dismissed" } });
    }
  });
}

/** Map a DB alert row to the domain Alert type */
function mapAlertRow(row: typeof schema.alerts.$inferSelect): Alert {
  return {
    id: row.id,
    merchantId: row.merchantId,
    source: row.source,
    status: row.status,
    stripeChargeId: row.stripeChargeId ?? undefined,
    stripePaymentIntentId: row.stripePaymentIntentId ?? undefined,
    stripeDisputeId: row.stripeDisputeId ?? undefined,
    stripeEfwId: row.stripeEfwId ?? undefined,
    amount: row.amount,
    currency: row.currency,
    reasonCategory: row.reasonCategory,
    reasonRaw: row.reasonRaw ?? undefined,
    customerEmail: row.customerEmail ?? undefined,
    customerId: row.customerId ?? undefined,
    cardLast4: row.cardLast4 ?? undefined,
    cardBrand: row.cardBrand ?? undefined,
    isActionable: row.isActionable,
    metadata: row.metadata ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
