import type { FastifyInstance } from "fastify";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import type { ApiResponse, OutcomesMetrics, OutcomesTimeSeries } from "@qarta/shared";
import { DISPUTE_FEE_CENTS } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

/**
 * Outcomes routes — dashboard metrics showing the value Qarta delivers.
 * This is the core of the product: "disputes avoided, fees saved, ratio protected."
 */
export async function outcomesRoutes(app: FastifyInstance) {
  // All outcomes routes require authentication
  app.addHook("preHandler", authenticateApiKey);

  // Get aggregated outcomes metrics for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    // Default to last 30 days
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    const merchantFilter = and(
      eq(schema.alerts.merchantId, merchant.id),
      gte(schema.alerts.createdAt, periodStart),
    );

    // Total alerts
    const [totalResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(merchantFilter);

    const alertsTotal = totalResult?.value ?? 0;

    // Auto-resolved
    const [autoResolvedResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(merchantFilter, eq(schema.alerts.status, "auto_refunded")),
      );

    const alertsAutoResolved = autoResolvedResult?.value ?? 0;

    // Escalated
    const [escalatedResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(merchantFilter, eq(schema.alerts.status, "escalated")),
      );

    const alertsEscalated = escalatedResult?.value ?? 0;

    // Dismissed
    const [dismissedResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(merchantFilter, eq(schema.alerts.status, "dismissed")),
      );

    const alertsDismissed = dismissedResult?.value ?? 0;

    // Manually resolved
    const [manuallyResolvedResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(merchantFilter, eq(schema.alerts.status, "manually_resolved")),
      );

    const manuallyResolved = manuallyResolvedResult?.value ?? 0;

    // Disputes avoided = auto_refunded + manually_resolved
    const disputesAvoided = alertsAutoResolved + manuallyResolved;

    // Total refunded amount
    const [refundedResult] = await db
      .select({ value: sum(schema.refundActions.refundAmount) })
      .from(schema.refundActions)
      .where(
        and(
          eq(schema.refundActions.merchantId, merchant.id),
          eq(schema.refundActions.status, "executed"),
          gte(schema.refundActions.createdAt, periodStart),
        ),
      );

    const totalRefunded = Number(refundedResult?.value ?? 0);

    // Fees avoided
    const feesAvoided = disputesAvoided * DISPUTE_FEE_CENTS.stripe;

    // Automation rate
    const automationRate =
      alertsTotal > 0
        ? Math.round((alertsAutoResolved / alertsTotal) * 100)
        : 0;

    // Average response time (ms) for resolved alerts
    const [avgTimeResult] = await db
      .select({
        value: sql<number>`avg(extract(epoch from (${schema.alerts.resolvedAt} - ${schema.alerts.createdAt})) * 1000)`,
      })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.merchantId, merchant.id),
          gte(schema.alerts.createdAt, periodStart),
          sql`${schema.alerts.resolvedAt} is not null`,
        ),
      );

    const avgResponseTime = Math.round(avgTimeResult?.value ?? 0);

    // Dispute rate estimates
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - 30);

    const [prevDisputesResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.merchantId, merchant.id),
          eq(schema.alerts.source, "stripe_dispute"),
          gte(schema.alerts.createdAt, prevPeriodStart),
          sql`${schema.alerts.createdAt} < ${periodStart}`,
        ),
      );

    const [currentDisputesResult] = await db
      .select({ value: count() })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.merchantId, merchant.id),
          eq(schema.alerts.source, "stripe_dispute"),
          gte(schema.alerts.createdAt, periodStart),
        ),
      );

    // Rough estimates — real dispute rate needs total transaction count from Stripe
    const disputeRateCurrent = alertsTotal > 0
      ? Number(((currentDisputesResult?.value ?? 0) / alertsTotal).toFixed(4))
      : 0;

    const prevTotal = prevDisputesResult?.value ?? 0;
    const disputeRatePrevious = prevTotal > 0
      ? Number((prevTotal / (prevTotal + alertsTotal)).toFixed(4))
      : 0;

    const response: ApiResponse<OutcomesMetrics> = {
      success: true,
      data: {
        alertsTotal,
        alertsAutoResolved,
        alertsEscalated,
        alertsDismissed,
        disputesAvoided,
        disputeRateCurrent,
        disputeRatePrevious,
        totalRefunded,
        feesAvoided,
        automationRate,
        avgResponseTime,
      },
    };

    return reply.send(response);
  });

  // Get time series data for charts (last 30 days)
  app.get("/timeseries", async (request, reply) => {
    const merchant = request.merchant!;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    const rows = await db
      .select({
        date: sql<string>`date(${schema.alerts.createdAt})`,
        alerts: count(),
        autoResolved: sql<number>`count(*) filter (where ${schema.alerts.status} = 'auto_refunded')`,
        escalated: sql<number>`count(*) filter (where ${schema.alerts.status} = 'escalated')`,
      })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.merchantId, merchant.id),
          gte(schema.alerts.createdAt, periodStart),
        ),
      )
      .groupBy(sql`date(${schema.alerts.createdAt})`)
      .orderBy(sql`date(${schema.alerts.createdAt})`);

    // Fill in missing dates with zeros
    const dataMap = new Map(
      rows.map((r) => [r.date, r]),
    );

    const timeseries: OutcomesTimeSeries[] = [];
    const cursor = new Date(periodStart);
    const today = new Date();

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0]!;
      const row = dataMap.get(dateStr);

      timeseries.push({
        date: dateStr,
        alerts: row?.alerts ?? 0,
        autoResolved: Number(row?.autoResolved ?? 0),
        escalated: Number(row?.escalated ?? 0),
        disputeRate: 0, // Would need transaction volume from Stripe for real rate
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const response: ApiResponse<OutcomesTimeSeries[]> = {
      success: true,
      data: timeseries,
    };

    return reply.send(response);
  });
}
