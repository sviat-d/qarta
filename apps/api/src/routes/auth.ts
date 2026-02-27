import type { FastifyInstance } from "fastify";
import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";
import { hashApiKey } from "../middleware/auth.js";

// --- Password hashing (scrypt, no external deps) ---

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derivedKey);
}

// --- Minimal JWT (HS256, Node.js crypto only) ---

function signJwt(
  payload: Record<string, unknown>,
  expiresInSeconds: number,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url",
  );
  const signature = createHmac("sha256", config.JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyJwt<T extends Record<string, unknown>>(
  token: string,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = createHmac("sha256", config.JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  const payload = JSON.parse(
    Buffer.from(payloadB64!, "base64url").toString(),
  );
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload as T;
}

// --- API key generation ---

function generateApiKey(): string {
  return `qk_live_${randomBytes(24).toString("base64url")}`;
}

// --- Validation schemas ---

const signupSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- Routes ---

export async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/signup — create merchant + generate API key
  app.post("/signup", async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid signup data",
          details: parsed.error.format(),
        },
      });
    }

    const { name, email, password } = parsed.data;

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

    const merchantId = nanoid();
    const passwordHashValue = hashPassword(password);
    const apiKey = generateApiKey();
    const apiKeyHashValue = hashApiKey(apiKey);

    await db.insert(schema.merchants).values({
      id: merchantId,
      name,
      email,
      passwordHash: passwordHashValue,
      apiKeyHash: apiKeyHashValue,
    });

    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId,
      actor: "user",
      event: "merchant_signup",
      details: { email },
    });

    // Generate JWT for immediate login
    const token = signJwt(
      { merchantId, email },
      7 * 24 * 60 * 60, // 7 days
    );

    app.log.info({ merchantId, email }, "Merchant signed up");

    return reply.status(201).send({
      success: true,
      data: {
        merchant: {
          id: merchantId,
          name,
          email,
        },
        token,
        apiKey, // Only shown once — merchant must save this
      },
    });
  });

  // POST /v1/auth/login — email/password → JWT
  app.post("/login", async (request, reply) => {
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

    if (!merchant || !verifyPassword(password, merchant.passwordHash)) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const token = signJwt(
      { merchantId: merchant.id, email: merchant.email },
      7 * 24 * 60 * 60, // 7 days
    );

    app.log.info({ merchantId: merchant.id }, "Merchant logged in");

    return reply.send({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          stripeAccountId: merchant.stripeAccountId,
          onboardedAt: merchant.onboardedAt,
          createdAt: merchant.createdAt,
        },
        token,
      },
    });
  });

  // GET /v1/auth/me — get current merchant (JWT auth)
  app.get("/me", async (request, reply) => {
    const merchant = extractMerchantFromJwt(request.headers.authorization);
    if (!merchant) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
    }

    const dbMerchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchant.merchantId),
    });

    if (!dbMerchant) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Merchant not found" },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: dbMerchant.id,
        name: dbMerchant.name,
        email: dbMerchant.email,
        stripeAccountId: dbMerchant.stripeAccountId,
        onboardedAt: dbMerchant.onboardedAt,
        createdAt: dbMerchant.createdAt,
      },
    });
  });

  // POST /v1/auth/api-keys/regenerate — regenerate API key (JWT auth)
  app.post("/api-keys/regenerate", async (request, reply) => {
    const merchant = extractMerchantFromJwt(request.headers.authorization);
    if (!merchant) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
    }

    const newApiKey = generateApiKey();
    const newApiKeyHash = hashApiKey(newApiKey);

    await db
      .update(schema.merchants)
      .set({ apiKeyHash: newApiKeyHash, updatedAt: new Date() })
      .where(eq(schema.merchants.id, merchant.merchantId));

    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId: merchant.merchantId,
      actor: "user",
      event: "api_key_regenerated",
      details: {},
    });

    app.log.info(
      { merchantId: merchant.merchantId },
      "API key regenerated",
    );

    return reply.send({
      success: true,
      data: {
        apiKey: newApiKey, // Only shown once
      },
    });
  });
}

// --- JWT helper ---

interface JwtPayload extends Record<string, unknown> {
  merchantId: string;
  email: string;
}

function extractMerchantFromJwt(
  authHeader: string | undefined,
): JwtPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyJwt<JwtPayload>(token);
}

// Export for use in dashboard auth middleware
export { verifyJwt, extractMerchantFromJwt };
