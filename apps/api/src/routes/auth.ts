import type { FastifyInstance } from "fastify";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiKey, hashApiKey } from "../middleware/auth.js";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";
import { sendPasswordResetEmail } from "../services/email-notifier.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, storedBuf);
}

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

/**
 * Auth routes — registration, login, and API key validation.
 */
export async function authRoutes(app: FastifyInstance) {
  // Strict rate limits for auth endpoints to prevent brute-force
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
        keyGenerator: (req: { ip: string }) => req.ip,
      },
    },
  };

  // Register a new merchant
  app.post("/register", authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid registration data",
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const { name, email, password } = parsed.data;

    // Check if email already registered
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate API key
    const apiKey = `qk_live_${randomBytes(24).toString("hex")}`;
    const apiKeyHash = hashApiKey(apiKey);

    // Create merchant
    const merchantId = `mer_${nanoid()}`;
    await db.insert(schema.merchants).values({
      id: merchantId,
      name,
      email,
      passwordHash,
      apiKeyHash,
    });

    // Create default policies
    const defaultPolicies = [
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

    for (const policy of defaultPolicies) {
      await db.insert(schema.policies).values(policy);
    }

    app.log.info({ merchantId, email }, "New merchant registered");

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

  // Login with email + password
  app.post("/login", authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login data",
        },
      });
    }

    const { email, password } = parsed.data;

    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.email, email),
    });

    if (!merchant || !merchant.passwordHash) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const valid = await verifyPassword(password, merchant.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // Return the merchant's API key — regenerate a new one for security
    const apiKey = `qk_live_${randomBytes(24).toString("hex")}`;
    const apiKeyHash = hashApiKey(apiKey);

    await db
      .update(schema.merchants)
      .set({ apiKeyHash, updatedAt: new Date() })
      .where(eq(schema.merchants.id, merchant.id));

    return reply.send({
      success: true,
      data: {
        apiKey,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          stripeAccountId: merchant.stripeAccountId,
        },
      },
    });
  });

  // Request password reset
  app.post("/forgot-password", authRateLimit, async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid email" },
      });
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.email, email),
    });

    if (merchant) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(schema.merchants)
        .set({
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.merchants.id, merchant.id));

      const resetUrl = `${config.DASHBOARD_URL}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(email, resetUrl);
        app.log.info({ merchantId: merchant.id }, "Password reset email sent");
      } catch (err) {
        app.log.error({ merchantId: merchant.id, err }, "Failed to send password reset email");
      }
    }

    return reply.send({
      success: true,
      data: { message: "If an account with that email exists, a reset link has been sent." },
    });
  });

  // Reset password with token
  app.post("/reset-password", authRateLimit, async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid reset data",
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const { token, password } = parsed.data;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.passwordResetToken, tokenHash),
    });

    if (
      !merchant ||
      !merchant.passwordResetExpiresAt ||
      merchant.passwordResetExpiresAt < new Date()
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Reset link is invalid or has expired",
        },
      });
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(schema.merchants)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.merchants.id, merchant.id));

    app.log.info({ merchantId: merchant.id }, "Password reset completed");

    return reply.send({
      success: true,
      data: { message: "Password has been reset successfully" },
    });
  });

  // Validate API key and return merchant info
  app.get(
    "/me",
    { onRequest: authenticateApiKey },
    async (request, reply) => {
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
    },
  );
}
