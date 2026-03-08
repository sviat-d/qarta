import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { config } from "../config.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Check PostgreSQL
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = { status: "ok", latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: "error", latency: Date.now() - dbStart };
    }

    const allOk = Object.values(checks).every((c) => c.status === "ok");

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? "ok" : "degraded",
      service: "qarta-api",
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Email config diagnostic (no secrets exposed)
  app.get("/health/email", async (_request, reply) => {
    const apiKeySet = !!config.EMAIL_API_KEY;
    const apiKeyPrefix = config.EMAIL_API_KEY
      ? config.EMAIL_API_KEY.substring(0, 6) + "..."
      : "NOT SET";

    return reply.send({
      provider: config.EMAIL_PROVIDER,
      from: config.EMAIL_FROM,
      apiKeyConfigured: apiKeySet,
      apiKeyPrefix,
      dashboardUrl: config.DASHBOARD_URL,
    });
  });
}
