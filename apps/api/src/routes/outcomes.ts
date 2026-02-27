import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import type { ApiResponse, OutcomesMetrics, OutcomesTimeSeries } from "@qarta/shared";
import { DISPUTE_FEE_CENTS } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

/**
 * Outcomes routes — dashboard metrics showing the value Qarta delivers.
 * This is the core of the product: "disputes avoided, fees saved, ratio protected."
 */
export async function outcomesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticateApiKey);

  // Get aggregated outcomes metrics for a merchant
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    // Run all aggregation queries in parallel
    const [alertStats, refundStats, avgResponseTime] = await Promise.all([
      // Alert counts by status
      db
        .select({
          status: schema.alerts.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.alerts)
        .where(eq(schema.alerts.merchantId, merchant.id))
        .groupBy(schema.alerts.status),

      // Total refunded amount
      db
        .select({
          total: sql<number>`coalesce(sum(${schema.refundActions.refundAmount}), 0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.refundActions)
        .where(
          and(
            eq(schema.refundActions.merchantId, merchant.id),
            eq(schema.refundActions.status, "executed"),
          ),
        ),

      // Average time from alert creation to resolution
      db
        .select({
          avg: sql<number>`coalesce(
            avg(extract(epoch from (${schema.alerts.resolvedAt} - ${schema.alerts.createdAt})) * 1000),
            0
          )::int`,
        })
        .from(schema.alerts)
        .where(
          and(
            eq(schema.alerts.merchantId, merchant.id),
            sql`${schema.alerts.resolvedAt} is not null`,
          ),
        ),
    ]);

    // Calculate metrics from aggregated data
    const statusCounts: Record<string, number> = {};
    let alertsTotal = 0;
    for (const row of alertStats) {
      statusCounts[row.status] = row.count;
      alertsTotal += row.count;
    }

    const alertsAutoResolved = statusCounts["auto_refunded"] ?? 0;
    const alertsEscalated = statusCounts["escalated"] ?? 0;
    const alertsDismissed = statusCounts["dismissed"] ?? 0;
    const alertsManuallyResolved = statusCounts["manually_resolved"] ?? 0;

    const disputesAvoided = alertsAutoResolved + alertsManuallyResolved;
    const totalRefunded = refundStats[0]?.total ?? 0;
    const feesAvoided = disputesAvoided * DISPUTE_FEE_CENTS.stripe;
    const automationRate = alertsTotal > 0
      ? Math.round((alertsAutoResolved / alertsTotal) * 100)
      : 0;

    const response: ApiResponse<OutcomesMetrics> = {
      success: true,
      data: {
        alertsTotal,
        alertsAutoResolved,
        alertsEscalated,
        alertsDismissed,
        disputesAvoided,
        disputeRateCurrent: 0, // Would come from Stripe API in production
        disputeRatePrevious: 0,
        totalRefunded,
        feesAvoided,
        automationRate,
        avgResponseTime: avgResponseTime[0]?.avg ?? 0,
      },
    };

    return reply.send(response);
  });

  // Get time series data for charts
  app.get("/timeseries", async (request, reply) => {
    const merchant = request.merchant!;

    const querySchema = z.object({
      days: z.coerce.number().int().min(7).max(90).default(30),
    });
    const { days } = querySchema.parse(request.query);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        date: sql<string>`date(${schema.alerts.createdAt})`,
        alerts: sql<number>`count(*)::int`,
        autoResolved: sql<number>`count(*) filter (where ${schema.alerts.status} = 'auto_refunded')::int`,
        escalated: sql<number>`count(*) filter (where ${schema.alerts.status} = 'escalated')::int`,
      })
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.merchantId, merchant.id),
          gte(schema.alerts.createdAt, since),
        ),
      )
      .groupBy(sql`date(${schema.alerts.createdAt})`)
      .orderBy(sql`date(${schema.alerts.createdAt})`);

    const timeseries: OutcomesTimeSeries[] = rows.map((row) => ({
      date: row.date,
      alerts: row.alerts,
      autoResolved: row.autoResolved,
      escalated: row.escalated,
      disputeRate: 0, // Would be computed from Stripe data
    }));

    const response: ApiResponse<OutcomesTimeSeries[]> = {
      success: true,
      data: timeseries,
    };

    return reply.send(response);
  });
}
