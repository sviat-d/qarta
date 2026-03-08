import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { authenticateApiKey } from "../middleware/auth.js";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

/**
 * Stripe Connect routes — merchant onboarding via Account Links.
 * Flow: create connected account → redirect to Stripe onboarding → handle return.
 */
export async function connectRoutes(app: FastifyInstance) {
  if (!config.STRIPE_SECRET_KEY) {
    app.log.warn("STRIPE_SECRET_KEY not set — Stripe Connect routes will return 503");
  }
  const stripe = config.STRIPE_SECRET_KEY
    ? new Stripe(config.STRIPE_SECRET_KEY)
    : null;

  function requireStripe(reply: import("fastify").FastifyReply): reply is import("fastify").FastifyReply {
    if (!stripe) {
      reply.status(503).send({
        success: false,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
      });
      return false;
    }
    return true;
  }

  // Start Stripe Connect onboarding — creates account + returns onboarding URL
  app.post("/stripe/onboard", { onRequest: authenticateApiKey }, async (request, reply) => {
    if (!requireStripe(reply)) return;
    const s = stripe!;
    const merchant = request.merchant!;

    try {
      // Check if merchant already has a connected account
      const existingConnection = await db.query.stripeConnections.findFirst({
        where: eq(schema.stripeConnections.merchantId, merchant.id),
      });

      let accountId: string;

      if (existingConnection) {
        // Re-use existing account — merchant may need to finish onboarding
        accountId = existingConnection.stripeAccountId;
      } else {
        // Create a new connected account (Standard type)
        const account = await s.accounts.create({
          type: "standard",
          email: merchant.email,
          metadata: { merchantId: merchant.id },
        });
        accountId = account.id;

        // Store the connection
        await db.insert(schema.stripeConnections).values({
          id: `sc_${nanoid()}`,
          merchantId: merchant.id,
          stripeAccountId: accountId,
          accessToken: "n/a", // Not used with Account Links
          scope: "read_write",
          livemode: false,
        });
      }

      // Create an Account Link for onboarding
      const accountLink = await s.accountLinks.create({
        account: accountId,
        refresh_url: `${config.DASHBOARD_URL}/settings?stripe=refresh`,
        return_url: `${config.DASHBOARD_URL}/settings?stripe=success`,
        type: "account_onboarding",
      });

      return reply.send({
        success: true,
        data: { url: accountLink.url },
      });
    } catch (err) {
      const stripeMessage = err instanceof Error ? err.message : "Unknown error";
      app.log.error({ err, stripeMessage }, "Failed to create Stripe Account Link");
      return reply.status(500).send({
        success: false,
        error: { code: "STRIPE_ERROR", message: stripeMessage },
      });
    }
  });

  // Legacy GET endpoint — redirect to POST onboard
  app.get("/stripe", { onRequest: authenticateApiKey }, async (request, reply) => {
    return reply.status(301).send({
      success: false,
      error: {
        code: "DEPRECATED",
        message: "Use POST /v1/connect/stripe/onboard instead",
      },
    });
  });

  // Handle return from Stripe onboarding — verify account status
  app.get<{
    Querystring: { account_id?: string };
  }>("/stripe/callback", async (request, reply) => {
    // Account Links don't use a callback — the return_url goes directly to the dashboard.
    // This endpoint is kept for backwards compatibility but redirects to dashboard.
    return reply.redirect(`${config.DASHBOARD_URL}/settings`);
  });

  // Check & update connection status after onboarding return
  app.post("/stripe/verify", { onRequest: authenticateApiKey }, async (request, reply) => {
    if (!requireStripe(reply)) return;
    const s = stripe!;
    const merchant = request.merchant!;

    const connection = await db.query.stripeConnections.findFirst({
      where: eq(schema.stripeConnections.merchantId, merchant.id),
    });

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "No Stripe connection found" },
      });
    }

    try {
      // Fetch account from Stripe to check onboarding status
      const account = await s.accounts.retrieve(connection.stripeAccountId);

      const isOnboarded = account.details_submitted && account.charges_enabled;

      if (isOnboarded) {
        // Update connection details
        await db
          .update(schema.stripeConnections)
          .set({
            livemode: account.charges_enabled ?? false,
            connectedAt: new Date(),
          })
          .where(eq(schema.stripeConnections.id, connection.id));

        // Update merchant
        const fullMerchant = await db.query.merchants.findFirst({
          where: eq(schema.merchants.id, merchant.id),
        });
        await db
          .update(schema.merchants)
          .set({
            stripeAccountId: connection.stripeAccountId,
            onboardedAt: fullMerchant?.onboardedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.merchants.id, merchant.id));

        // Audit log
        await db.insert(schema.auditLog).values({
          id: `aud_${nanoid()}`,
          merchantId: merchant.id,
          actor: "user",
          event: "stripe_connected",
          details: {
            stripeAccountId: connection.stripeAccountId,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          },
        });

        app.log.info(
          { merchantId: merchant.id, stripeAccountId: connection.stripeAccountId },
          "Stripe connected via Account Links",
        );
      }

      return reply.send({
        success: true,
        data: {
          connected: isOnboarded,
          stripeAccountId: connection.stripeAccountId,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        },
      });
    } catch (err) {
      app.log.error({ err }, "Failed to verify Stripe account");
      return reply.status(500).send({
        success: false,
        error: { code: "STRIPE_ERROR", message: "Failed to verify Stripe account status" },
      });
    }
  });

  // Get connection status
  app.get("/stripe/status", { onRequest: authenticateApiKey }, async (request, reply) => {
    const merchant = request.merchant!;

    const connection = await db.query.stripeConnections.findFirst({
      where: eq(schema.stripeConnections.merchantId, merchant.id),
    });

    if (!connection) {
      return reply.send({
        success: true,
        data: {
          connected: false,
          stripeAccountId: null,
          livemode: false,
          connectedAt: null,
        },
      });
    }

    if (!stripe) {
      // Can't verify with Stripe, return cached data
      return reply.send({
        success: true,
        data: {
          connected: !!connection.stripeAccountId,
          stripeAccountId: connection.stripeAccountId,
          livemode: connection.livemode,
          connectedAt: connection.connectedAt,
        },
      });
    }

    // Optionally check live status from Stripe
    try {
      const account = await stripe.accounts.retrieve(connection.stripeAccountId);
      return reply.send({
        success: true,
        data: {
          connected: !!(account.details_submitted && account.charges_enabled),
          stripeAccountId: connection.stripeAccountId,
          livemode: connection.livemode,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
          connectedAt: connection.connectedAt,
        },
      });
    } catch {
      // If we can't reach Stripe, return cached data
      return reply.send({
        success: true,
        data: {
          connected: !!connection.stripeAccountId,
          stripeAccountId: connection.stripeAccountId,
          livemode: connection.livemode,
          connectedAt: connection.connectedAt,
        },
      });
    }
  });
}
