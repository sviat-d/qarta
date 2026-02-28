import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { authenticateApiKey } from "../middleware/auth.js";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

/**
 * Stripe Connect OAuth routes — merchant onboarding.
 * Flow: merchant clicks "Connect Stripe" → redirected to Stripe OAuth → callback stores tokens.
 */
export async function connectRoutes(app: FastifyInstance) {
  // Initiate Stripe OAuth — requires auth to know which merchant
  app.get("/stripe", { onRequest: authenticateApiKey }, async (request, reply) => {
    const merchant = request.merchant!;

    if (!config.STRIPE_CLIENT_ID) {
      return reply.status(500).send({
        success: false,
        error: { code: "CONFIG_ERROR", message: "Stripe Connect is not configured" },
      });
    }

    const state = `${merchant.id}:${nanoid(16)}`;

    const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", config.STRIPE_CLIENT_ID);
    authorizeUrl.searchParams.set("scope", "read_write");
    authorizeUrl.searchParams.set("state", state);

    return reply.send({
      success: true,
      data: { url: authorizeUrl.toString(), state },
    });
  });

  // Handle Stripe OAuth callback — no auth header (redirect from Stripe)
  app.get<{
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>("/stripe/callback", async (request, reply) => {
    const { code, state, error, error_description } = request.query;

    if (error) {
      return reply.status(400).send({
        success: false,
        error: { code: "OAUTH_ERROR", message: error_description ?? error },
      });
    }

    if (!code || !state) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Missing code or state parameter" },
      });
    }

    // Extract merchant ID from state
    const merchantId = state.split(":")[0];
    if (!merchantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid state parameter" },
      });
    }

    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchantId),
    });

    if (!merchant) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Merchant not found" },
      });
    }

    try {
      // Exchange authorization code for access token
      const stripe = new Stripe(config.STRIPE_SECRET_KEY!);
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });

      if (!response.stripe_user_id) {
        return reply.status(400).send({
          success: false,
          error: { code: "OAUTH_ERROR", message: "No Stripe account ID returned" },
        });
      }

      // Upsert Stripe connection
      const existingConnection = await db.query.stripeConnections.findFirst({
        where: eq(schema.stripeConnections.merchantId, merchantId),
      });

      if (existingConnection) {
        await db
          .update(schema.stripeConnections)
          .set({
            stripeAccountId: response.stripe_user_id,
            accessToken: response.access_token!,
            refreshToken: response.refresh_token ?? null,
            scope: response.scope ?? "read_write",
            livemode: response.livemode ?? false,
            connectedAt: new Date(),
          })
          .where(eq(schema.stripeConnections.id, existingConnection.id));
      } else {
        await db.insert(schema.stripeConnections).values({
          id: `sc_${nanoid()}`,
          merchantId,
          stripeAccountId: response.stripe_user_id,
          accessToken: response.access_token!,
          refreshToken: response.refresh_token ?? null,
          scope: response.scope ?? "read_write",
          livemode: response.livemode ?? false,
        });
      }

      // Update merchant's Stripe account ID
      await db
        .update(schema.merchants)
        .set({
          stripeAccountId: response.stripe_user_id,
          onboardedAt: merchant.onboardedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.merchants.id, merchantId));

      // Auto-register webhook endpoint on the connected account
      let webhookEndpointId: string | null = null;
      if (config.API_PUBLIC_URL) {
        try {
          const connectedStripe = new Stripe(response.access_token!);
          const webhookEndpoint = await connectedStripe.webhookEndpoints.create({
            url: `${config.API_PUBLIC_URL}/v1/webhooks/stripe`,
            enabled_events: [
              "radar.early_fraud_warning.created",
              "charge.dispute.created",
              "charge.dispute.updated",
              "charge.dispute.closed",
              "charge.refunded",
            ],
            description: "Qarta chargeback deflection",
          });
          webhookEndpointId = webhookEndpoint.id;
          app.log.info(
            { webhookEndpointId, merchantId },
            "Stripe webhook endpoint registered",
          );
        } catch (webhookErr) {
          // Non-blocking: webhook can be set up manually later
          app.log.warn({ err: webhookErr, merchantId }, "Failed to auto-register webhook endpoint");
        }
      }

      // Audit log
      await db.insert(schema.auditLog).values({
        id: `aud_${nanoid()}`,
        merchantId,
        actor: "user",
        event: "stripe_connected",
        details: {
          stripeAccountId: response.stripe_user_id,
          livemode: response.livemode,
          webhookEndpointId,
        },
      });

      // Redirect to dashboard with success indicator
      const redirectUrl = new URL(`${config.DASHBOARD_URL}/onboarding`);
      redirectUrl.searchParams.set("stripe", "connected");
      return reply.redirect(redirectUrl.toString());
    } catch (err) {
      app.log.error({ err }, "Stripe OAuth token exchange failed");

      // Redirect to dashboard with error
      const redirectUrl = new URL(`${config.DASHBOARD_URL}/onboarding`);
      redirectUrl.searchParams.set("stripe", "error");
      return reply.redirect(redirectUrl.toString());
    }
  });

  // Get connection status
  app.get("/stripe/status", { onRequest: authenticateApiKey }, async (request, reply) => {
    const merchant = request.merchant!;

    const connection = await db.query.stripeConnections.findFirst({
      where: eq(schema.stripeConnections.merchantId, merchant.id),
    });

    return reply.send({
      success: true,
      data: {
        connected: !!connection,
        stripeAccountId: connection?.stripeAccountId ?? null,
        livemode: connection?.livemode ?? false,
        connectedAt: connection?.connectedAt ?? null,
      },
    });
  });
}
