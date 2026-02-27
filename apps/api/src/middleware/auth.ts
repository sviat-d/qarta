import type { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

// Extend Fastify request type to include merchant
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

export function hashApiKey(apiKey: string): string {
  return createHash("sha256")
    .update(apiKey + config.API_KEY_SALT)
    .digest("hex");
}
