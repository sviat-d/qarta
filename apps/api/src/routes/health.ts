import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

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
}
