import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, like, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ApiResponse, Alert, PaginatedResponse, AlertStatus } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { executeRefund } from "../services/refund-executor.js";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "new",
      "evaluating",
      "auto_refunded",
      "escalated",
      "manually_resolved",
      "dismissed",
      "expired",
    ])
    .optional(),
  search: z.string().optional(),
});

const resolveBodySchema = z.object({
  action: z.enum(["refund", "dismiss"]),
  note: z.string().optional(),
});

/**
 * Alert routes — view and manage pre-dispute alerts.
 */
export async function alertRoutes(app: FastifyInstance) {
  // All alert routes require authentication
  app.addHook("preHandler", authenticateApiKey);

  // List alerts for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;
    const query = listQuerySchema.parse(request.query);

    const conditions = [eq(schema.alerts.merchantId, merchant.id)];

    if (query.status) {
      conditions.push(eq(schema.alerts.status, query.status));
    }

    if (query.search) {
      conditions.push(
        like(schema.alerts.customerEmail, `%${query.search}%`),
      );
    }

    const where = conditions.length === 1 ? conditions[0]! : and(...conditions);

    const allAlerts = await db.query.alerts.findMany({
      where,
      orderBy: [desc(schema.alerts.createdAt)],
      limit: query.perPage,
      offset: (query.page - 1) * query.perPage,
    });

    // Count total for pagination
    const [totalResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(where);

    const response: PaginatedResponse<Alert> = {
      success: true,
      data: allAlerts.map(dbAlertToAlert),
      meta: {
        total: totalResult?.value ?? 0,
        page: query.page,
        perPage: query.perPage,
      },
    };

    return reply.send(response);
  });

  // Get alert by ID
  app.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
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

    const response: ApiResponse<Alert> = {
      success: true,
      data: dbAlertToAlert(alert),
    };

    return reply.send(response);
  });

  // Manually resolve an alert
  app.post<{
    Params: { id: string };
  }>("/:id/resolve", async (request, reply) => {
    const merchant = request.merchant!;
    const { id } = request.params;

    const parsed = resolveBodySchema.safeParse(request.body);
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

    const { action, note } = parsed.data;

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

    // Only allow resolving alerts in certain states
    const resolvableStatuses: AlertStatus[] = ["new", "escalated"];
    if (!resolvableStatuses.includes(alert.status as AlertStatus)) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: `Cannot resolve alert in '${alert.status}' status`,
        },
      });
    }

    if (action === "refund") {
      if (!config.STRIPE_SECRET_KEY || !alert.stripeChargeId) {
        return reply.status(422).send({
          success: false,
          error: {
            code: "UNPROCESSABLE",
            message: "Cannot refund: missing Stripe configuration or charge ID",
          },
        });
      }

      const refundResult = await executeRefund(
        config.STRIPE_SECRET_KEY,
        {
          stripeChargeId: alert.stripeChargeId,
          amount: alert.amount,
          reason: alert.reasonCategory ?? "manual_resolution",
        },
        merchant.stripeAccountId ?? undefined,
      );

      const actionId = nanoid();
      await db.insert(schema.refundActions).values({
        id: actionId,
        alertId: id,
        merchantId: merchant.id,
        status: refundResult.success ? "executed" : "failed",
        refundAmount: alert.amount,
        currency: alert.currency,
        stripeRefundId: refundResult.stripeRefundId,
        stripeChargeId: alert.stripeChargeId,
        failureReason: refundResult.failureReason,
        executedAt: refundResult.success ? new Date() : undefined,
      });

      if (!refundResult.success) {
        await db.insert(schema.auditLog).values({
          id: nanoid(),
          merchantId: merchant.id,
          alertId: id,
          actionId,
          actor: "user",
          event: "manual_refund_failed",
          details: { note, failureReason: refundResult.failureReason },
        });

        return reply.status(422).send({
          success: false,
          error: {
            code: "REFUND_FAILED",
            message: refundResult.failureReason ?? "Refund failed",
          },
        });
      }

      await db
        .update(schema.alerts)
        .set({
          status: "manually_resolved",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.alerts.id, id));

      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId: merchant.id,
        alertId: id,
        actionId,
        actor: "user",
        event: "manual_refund_executed",
        details: {
          note,
          amount: alert.amount,
          stripeRefundId: refundResult.stripeRefundId,
        },
      });
    } else {
      // Dismiss
      await db
        .update(schema.alerts)
        .set({
          status: "dismissed",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.alerts.id, id));

      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId: merchant.id,
        alertId: id,
        actor: "user",
        event: "alert_dismissed_manually",
        details: { note },
      });
    }

    const newStatus = action === "refund" ? "manually_resolved" : "dismissed";

    app.log.info(
      { alertId: id, action, newStatus },
      "Manual alert resolution",
    );

    return reply.send({
      success: true,
      data: { id, status: newStatus },
    });
  });
}

function dbAlertToAlert(
  row: typeof schema.alerts.$inferSelect,
): Alert {
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
