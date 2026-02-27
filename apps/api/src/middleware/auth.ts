import type { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

// Augment FastifyRequest with merchant context
declare module "fastify" {
  interface FastifyRequest {
    merchant?: {
      id: string;
      name: string;
      email: string;
      stripeAccountId: string | null;
    };
  }
}

/**
 * API key authentication middleware.
 * Merchants authenticate via `Authorization: Bearer <api-key>` header.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid Authorization header",
      },
    });
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);

  const merchant = await db.query.merchants.findFirst({
    where: eq(schema.merchants.apiKeyHash, keyHash),
  });

  if (!merchant) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid API key",
      },
    });
  }

  request.merchant = {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    stripeAccountId: merchant.stripeAccountId,
  };
}

/**
 * JWT authentication middleware for dashboard routes.
 * Merchants authenticate via `Authorization: Bearer <jwt-token>` header.
 */
export async function authenticateJwt(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { extractMerchantFromJwt } = await import("../routes/auth.js");

  const payload = extractMerchantFromJwt(request.headers.authorization);
  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }

  const merchant = await db.query.merchants.findFirst({
    where: eq(schema.merchants.id, payload.merchantId),
  });

  if (!merchant) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Merchant not found",
      },
    });
  }

  request.merchant = {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    stripeAccountId: merchant.stripeAccountId,
  };
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256")
    .update(apiKey + config.API_KEY_SALT)
    .digest("hex");
}
