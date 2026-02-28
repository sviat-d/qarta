import type { FastifyInstance } from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authenticateApiKey } from "../middleware/auth.js";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

/**
 * Auth routes — registration, login validation, merchant info.
 */
export async function authRoutes(app: FastifyInstance) {
  // Validate API key and return merchant info
  app.get("/me", { onRequest: authenticateApiKey }, async (request, reply) => {
    const merchant = request.merchant!;

    return reply.send({
      success: true,
      data: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        stripeAccountId: merchant.stripeAccountId,
      },
    });
  });

  // Register a new merchant account
  app.post("/register", async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
      });
    }

    const { name, email } = parsed.data;

    // Check if email already exists
    const existing = await db.query.merchants.findFirst({
      where: eq(schema.merchants.email, email),
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists",
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
      name,
      email,
      apiKeyHash,
    });

    // Create a sensible default policy
    await db.insert(schema.policies).values({
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
    });

    // Audit log
    await db.insert(schema.auditLog).values({
      id: `aud_${nanoid()}`,
      merchantId,
      actor: "user",
      event: "merchant_registered",
      details: { email },
    });

    return reply.status(201).send({
      success: true,
      data: {
        merchantId,
        name,
        email,
        apiKey,
      },
    });
  });
}
