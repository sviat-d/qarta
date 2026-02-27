import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { createStripeClient } from "../providers/stripe.js";
import { db, schema } from "../db/index.js";

/**
 * Stripe Connect OAuth routes.
 *
 * Flow:
 * 1. GET /v1/connect/stripe
 *    → Generates a Stripe OAuth URL and redirects the merchant.
 *    → Requires `merchantId` query param (temporary; will use session auth later).
 *
 * 2. GET /v1/connect/stripe/callback
 *    → Stripe redirects here with ?code=xxx&state=merchantId
 *    → We exchange the code for an access token via Stripe OAuth.
 *    → Save the connection in `stripe_connections` table.
 *    → Redirect merchant to the dashboard.
 */
export async function connectRoutes(app: FastifyInstance) {
  // --- Step 1: Initiate OAuth ---
  app.get<{
    Querystring: { merchantId?: string };
  }>("/stripe", async (request, reply) => {
    const { merchantId } = request.query;

    if (!merchantId) {
      return reply.status(400).send({
        success: false,
        error: "merchantId query parameter is required",
      });
    }

    if (!config.STRIPE_CLIENT_ID) {
      return reply.status(500).send({
        success: false,
        error: "Stripe Connect is not configured (missing STRIPE_CLIENT_ID)",
      });
    }

    // Verify merchant exists
    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchantId),
    });

    if (!merchant) {
      return reply.status(404).send({
        success: false,
        error: "Merchant not found",
      });
    }

    // Build Stripe OAuth authorize URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.STRIPE_CLIENT_ID,
      scope: "read_write",
      state: merchantId, // passed back in callback
      redirect_uri: `${config.API_BASE_URL}/v1/connect/stripe/callback`,
      "stripe_user[email]": merchant.email,
      "stripe_user[business_name]": merchant.name,
    });

    const authorizeUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    request.log.info(
      { merchantId, authorizeUrl },
      "Redirecting merchant to Stripe OAuth",
    );

    return reply.redirect(authorizeUrl);
  });

  // --- Step 2: Handle OAuth callback ---
  app.get<{
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>("/stripe/callback", async (request, reply) => {
    const { code, state: merchantId, error, error_description } = request.query;

    // Handle OAuth errors (merchant denied access, etc.)
    if (error) {
      request.log.warn(
        { error, error_description, merchantId },
        "Stripe OAuth error",
      );
      const errorParams = new URLSearchParams({
        error: "stripe_oauth_failed",
        message: error_description || error,
      });
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?${errorParams.toString()}`,
      );
    }

    if (!code || !merchantId) {
      return reply.status(400).send({
        success: false,
        error: "Missing code or state parameter",
      });
    }

    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(500).send({
        success: false,
        error: "Stripe is not configured (missing STRIPE_SECRET_KEY)",
      });
    }

    // Verify merchant exists
    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchantId),
    });

    if (!merchant) {
      request.log.error({ merchantId }, "Merchant not found during OAuth callback");
      return reply.status(404).send({
        success: false,
        error: "Merchant not found",
      });
    }

    // Exchange authorization code for access token
    try {
      const stripe = createStripeClient(config.STRIPE_SECRET_KEY);

      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });

      const {
        stripe_user_id: stripeAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        scope,
        livemode,
      } = response;

      if (!stripeAccountId || !accessToken) {
        throw new Error("Missing stripe_user_id or access_token in response");
      }

      request.log.info(
        { merchantId, stripeAccountId, livemode },
        "Stripe OAuth token exchange successful",
      );

      // Upsert stripe connection — replace if merchant reconnects
      const existingConnection = await db.query.stripeConnections.findFirst({
        where: eq(schema.stripeConnections.merchantId, merchantId),
      });

      if (existingConnection) {
        await db
          .update(schema.stripeConnections)
          .set({
            stripeAccountId,
            accessToken,
            refreshToken: refreshToken ?? null,
            scope: scope ?? "read_write",
            livemode: livemode ?? false,
            connectedAt: new Date(),
          })
          .where(eq(schema.stripeConnections.merchantId, merchantId));
      } else {
        await db.insert(schema.stripeConnections).values({
          id: nanoid(),
          merchantId,
          stripeAccountId,
          accessToken,
          refreshToken: refreshToken ?? null,
          scope: scope ?? "read_write",
          livemode: livemode ?? false,
        });
      }

      // Update merchant with stripe account ID + mark as onboarded
      await db
        .update(schema.merchants)
        .set({
          stripeAccountId,
          onboardedAt: merchant.onboardedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.merchants.id, merchantId));

      // Write audit log
      await db.insert(schema.auditLog).values({
        id: nanoid(),
        merchantId,
        actor: "system",
        event: "stripe_connected",
        details: {
          stripeAccountId,
          livemode,
          scope,
        },
      });

      // Redirect to dashboard with success
      const successParams = new URLSearchParams({
        connected: "true",
        account: stripeAccountId,
      });
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?${successParams.toString()}`,
      );
    } catch (err) {
      request.log.error(
        { err, merchantId },
        "Failed to exchange Stripe OAuth code",
      );

      const errorParams = new URLSearchParams({
        error: "token_exchange_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?${errorParams.toString()}`,
      );
    }
  });
}
