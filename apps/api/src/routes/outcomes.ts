import type { FastifyInstance } from "fastify";
import type { ApiResponse, OutcomesMetrics, OutcomesTimeSeries } from "@qarta/shared";

/**
 * Outcomes routes — dashboard metrics showing the value Qarta delivers.
 * This is the core of the product: "disputes avoided, fees saved, ratio protected."
 */
export async function outcomesRoutes(app: FastifyInstance) {
  // Get aggregated outcomes metrics for a merchant
  app.get("/", async (_request, reply) => {
    // TODO: Authenticate merchant via API key
    // TODO: Query database for:
    //   - Total alerts in period
    //   - Auto-resolved count
    //   - Escalated count
    //   - Dismissed count
    //   - Estimated disputes avoided (auto_refunded + manually_resolved alerts)
    //   - Current dispute rate (from Stripe API or computed)
    //   - Total refunded amount
    //   - Estimated fees avoided (disputes_avoided * $15)
    //   - Automation rate (auto_resolved / total * 100)
    //   - Average response time

    const response: ApiResponse<OutcomesMetrics> = {
      success: true,
      data: {
        alertsTotal: 0,
        alertsAutoResolved: 0,
        alertsEscalated: 0,
        alertsDismissed: 0,
        disputesAvoided: 0,
        disputeRateCurrent: 0,
        disputeRatePrevious: 0,
        totalRefunded: 0,
        feesAvoided: 0,
        automationRate: 0,
        avgResponseTime: 0,
      },
    };

    return reply.send(response);
  });

  // Get time series data for charts
  app.get("/timeseries", async (_request, reply) => {
    // TODO: Authenticate merchant
    // TODO: Query daily aggregated data for the last 30 days

    const response: ApiResponse<OutcomesTimeSeries[]> = {
      success: true,
      data: [],
    };

    return reply.send(response);
  });
}
