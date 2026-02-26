import type { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "node:crypto";
import { config } from "../config.js";

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
  const _keyHash = hashApiKey(apiKey);

  // TODO: Look up merchant by key hash in database
  // const merchant = await db.query.merchants.findFirst({ where: eq(schema.merchants.apiKeyHash, keyHash) });
  // if (!merchant) return reply.status(401).send(...)
  // request.merchant = merchant;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256")
    .update(apiKey + config.API_KEY_SALT)
    .digest("hex");
}
