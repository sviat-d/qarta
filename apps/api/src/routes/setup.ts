import type { FastifyInstance } from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { count } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

/**
 * One-time setup route — creates the first merchant and returns an API key.
 * Only works when no merchants exist yet (first-time setup).
 * After the first merchant is created, this endpoint returns 403.
 */
export async function setupRoutes(app: FastifyInstance) {
  app.get("/seed", async (_request, reply) => {
    // Safety: only allow if no merchants exist
    const [result] = await db
      .select({ total: count() })
      .from(schema.merchants);

    if (result.total > 0) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "SETUP_COMPLETE",
          message:
            "Setup already completed. Merchants already exist in the database.",
        },
      });
    }

    // Generate API key
    const apiKey = `qk_live_${randomBytes(24).toString("hex")}`;
    const apiKeyHash = createHash("sha256")
      .update(apiKey + config.API_KEY_SALT)
      .digest("hex");

    // Create merchant
    const merchantId = `mer_${nanoid()}`;
    await db.insert(schema.merchants).values({
      id: merchantId,
      name: "Demo Merchant",
      email: "demo@qarta.eu",
      apiKeyHash,
    });

    // Create default policies
    const policies = [
      {
        id: `pol_${nanoid()}`,
        merchantId,
        name: "Auto-refund small fraud alerts",
        priority: 1,
        conditions: [
          { field: "amount", operator: "lt", value: 10000 },
          { field: "reason_category", operator: "eq", value: "fraudulent" },
          { field: "source", operator: "eq", value: "stripe_efw" },
        ],
        actionType: "auto_refund" as const,
        cancelSubscription: false,
        maxRefundsPerDay: 25,
        maxRefundsPerCustomer: 3,
        maxRefundAmount: 10000,
      },
      {
        id: `pol_${nanoid()}`,
        merchantId,
        name: "Escalate high-value alerts",
        priority: 2,
        conditions: [{ field: "amount", operator: "gte", value: 10000 }],
        actionType: "escalate" as const,
        cancelSubscription: false,
        maxRefundsPerDay: 50,
        maxRefundsPerCustomer: 5,
        maxRefundAmount: 100000,
      },
      {
        id: `pol_${nanoid()}`,
        merchantId,
        name: "Dismiss duplicate alerts",
        priority: 3,
        conditions: [
          { field: "reason_category", operator: "eq", value: "duplicate" },
        ],
        actionType: "dismiss" as const,
        cancelSubscription: false,
        maxRefundsPerDay: 100,
        maxRefundsPerCustomer: 10,
        maxRefundAmount: 50000,
      },
    ];

    for (const policy of policies) {
      await db.insert(schema.policies).values(policy);
    }

    return reply.send({
      success: true,
      message: "Merchant created! Save your API key — it is shown only once.",
      data: {
        merchantId,
        name: "Demo Merchant",
        email: "demo@qarta.eu",
        apiKey,
        policiesCreated: policies.length,
      },
    });
  });
}
