import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { createStripeClient } from "../providers/stripe.js";
import { db, schema } from "../db/index.js";

/**
 * Stripe Connect routes (Standard Connect via Account Links).
 *
 * Modern flow (no OAuth Client ID needed):
 *
 * 1. POST /v1/connect/stripe
 *    → Creates a Standard connected account in Stripe
 *    → Generates an Account Link for onboarding
 *    → Returns the onboarding URL
 *
 * 2. GET /v1/connect/stripe/callback
 *    → Stripe redirects here after onboarding completes
 *    → Verifies account status, saves connection to DB
 *    → Redirects merchant to dashboard
 *
 * 3. GET /v1/connect/stripe/refresh
 *    → Generates a new Account Link if the previous one expired
 *
 * API calls on behalf of connected accounts use:
 *   stripe.charges.list({}, { stripeAccount: connectedAccountId })
 */
export async function connectRoutes(app: FastifyInstance) {
  // --- Step 1: Create connected account + onboarding link ---
  app.post<{
    Body: { merchantId?: string };
  }>("/stripe", async (request, reply) => {
    const { merchantId } = request.body ?? {};

    if (!merchantId) {
      return reply.status(400).send({
        success: false,
        error: "merchantId is required",
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
      return reply.status(404).send({
        success: false,
        error: "Merchant not found",
      });
    }

    const stripe = createStripeClient(config.STRIPE_SECRET_KEY);

    // Check if merchant already has a connected account
    let stripeAccountId = merchant.stripeAccountId;

    if (!stripeAccountId) {
      // Create a new Standard connected account
      const account = await stripe.accounts.create({
        type: "standard",
        email: merchant.email,
        metadata: {
          qarta_merchant_id: merchantId,
        },
      });

      stripeAccountId = account.id;

      // Save account ID to merchant immediately
      await db
        .update(schema.merchants)
        .set({
          stripeAccountId,
          updatedAt: new Date(),
        })
        .where(eq(schema.merchants.id, merchantId));

      request.log.info(
        { merchantId, stripeAccountId },
        "Created Stripe connected account",
      );
    }

    // Generate Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${config.API_BASE_URL}/v1/connect/stripe/refresh?merchantId=${merchantId}`,
      return_url: `${config.API_BASE_URL}/v1/connect/stripe/callback?merchantId=${merchantId}`,
      type: "account_onboarding",
    });

    return reply.send({
      success: true,
      data: {
        url: accountLink.url,
        stripeAccountId,
      },
    });
  });

  // --- Step 2: Handle return from Stripe onboarding ---
  app.get<{
    Querystring: { merchantId?: string };
  }>("/stripe/callback", async (request, reply) => {
    const { merchantId } = request.query;

    if (!merchantId) {
      return reply.status(400).send({
        success: false,
        error: "merchantId query parameter is required",
      });
    }

    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(500).send({
        success: false,
        error: "Stripe is not configured",
      });
    }

    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchantId),
    });

    if (!merchant || !merchant.stripeAccountId) {
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?error=merchant_not_found`,
      );
    }

    const stripe = createStripeClient(config.STRIPE_SECRET_KEY);

    // Check if the account has completed onboarding
    const account = await stripe.accounts.retrieve(merchant.stripeAccountId);

    if (!account.charges_enabled || !account.details_submitted) {
      // Onboarding not complete — redirect back with status
      request.log.warn(
        { merchantId, stripeAccountId: merchant.stripeAccountId },
        "Stripe onboarding not complete",
      );
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?error=onboarding_incomplete`,
      );
    }

    // Onboarding complete — save/update connection
    const existingConnection = await db.query.stripeConnections.findFirst({
      where: eq(schema.stripeConnections.merchantId, merchantId),
    });

    if (existingConnection) {
      await db
        .update(schema.stripeConnections)
        .set({
          stripeAccountId: merchant.stripeAccountId,
          scope: "read_write",
          livemode: account.charges_enabled,
          connectedAt: new Date(),
        })
        .where(eq(schema.stripeConnections.merchantId, merchantId));
    } else {
      await db.insert(schema.stripeConnections).values({
        id: nanoid(),
        merchantId,
        stripeAccountId: merchant.stripeAccountId,
        scope: "read_write",
        livemode: account.charges_enabled,
      });
    }

    // Mark merchant as onboarded
    await db
      .update(schema.merchants)
      .set({
        onboardedAt: merchant.onboardedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.merchants.id, merchantId));

    // Audit log
    await db.insert(schema.auditLog).values({
      id: nanoid(),
      merchantId,
      actor: "system",
      event: "stripe_connected",
      details: {
        stripeAccountId: merchant.stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
    });

    request.log.info(
      { merchantId, stripeAccountId: merchant.stripeAccountId },
      "Stripe Connect onboarding complete",
    );

    return reply.redirect(
      `${config.DASHBOARD_URL}/settings/connect?connected=true&account=${merchant.stripeAccountId}`,
    );
  });

  // --- Step 3: Refresh expired Account Link ---
  app.get<{
    Querystring: { merchantId?: string };
  }>("/stripe/refresh", async (request, reply) => {
    const { merchantId } = request.query;

    if (!merchantId || !config.STRIPE_SECRET_KEY) {
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?error=invalid_request`,
      );
    }

    const merchant = await db.query.merchants.findFirst({
      where: eq(schema.merchants.id, merchantId),
    });

    if (!merchant?.stripeAccountId) {
      return reply.redirect(
        `${config.DASHBOARD_URL}/settings/connect?error=merchant_not_found`,
      );
    }

    const stripe = createStripeClient(config.STRIPE_SECRET_KEY);

    // Generate a fresh Account Link
    const accountLink = await stripe.accountLinks.create({
      account: merchant.stripeAccountId,
      refresh_url: `${config.API_BASE_URL}/v1/connect/stripe/refresh?merchantId=${merchantId}`,
      return_url: `${config.API_BASE_URL}/v1/connect/stripe/callback?merchantId=${merchantId}`,
      type: "account_onboarding",
    });

    return reply.redirect(accountLink.url);
  });
}
