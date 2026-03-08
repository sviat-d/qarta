import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db, schema } from "../db/index.js";

let _stripe: Stripe | null = null;

/**
 * Get a Stripe client instance for the platform account.
 */
export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!config.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(config.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

/**
 * Get a Stripe client authenticated as a connected account.
 */
export function getStripeClientForAccount(accessToken: string): Stripe {
  return new Stripe(accessToken);
}

/**
 * Refresh a Stripe OAuth access token using the stored refresh_token.
 * Updates the database with the new access token and returns it.
 * Returns null if refresh fails (e.g., merchant revoked access).
 */
export async function refreshStripeToken(
  stripeAccountId: string,
): Promise<string | null> {
  const connection = await db.query.stripeConnections.findFirst({
    where: eq(schema.stripeConnections.stripeAccountId, stripeAccountId),
  });

  if (!connection?.refreshToken) {
    return null;
  }

  try {
    const stripe = getStripeClient();
    const response = await stripe.oauth.token({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    });

    if (!response.access_token) {
      return null;
    }

    // Update stored token
    await db
      .update(schema.stripeConnections)
      .set({ accessToken: response.access_token })
      .where(eq(schema.stripeConnections.id, connection.id));

    return response.access_token;
  } catch {
    return null;
  }
}

/**
 * Execute a Stripe API call with automatic token refresh on auth failure.
 * If the call fails with an authentication error, refreshes the token and retries once.
 */
export async function withTokenRefresh<T>(
  stripeAccountId: string,
  accessToken: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  try {
    return await fn(accessToken);
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeAuthenticationError ||
      (error instanceof Stripe.errors.StripeError && error.statusCode === 401)
    ) {
      // Token expired or revoked — try refreshing
      const newToken = await refreshStripeToken(stripeAccountId);
      if (newToken) {
        return await fn(newToken);
      }
    }
    throw error;
  }
}

/**
 * Verify and construct a Stripe webhook event from the raw body + signature.
 * Returns null if verification fails.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event | null {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  try {
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return null;
  }
}

/**
 * Verify and construct a Stripe Connect webhook event from the raw body + signature.
 * Uses STRIPE_CONNECT_WEBHOOK_SECRET for connected account events.
 * Returns null if verification fails.
 */
export function verifyConnectWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event | null {
  if (!config.STRIPE_CONNECT_WEBHOOK_SECRET) {
    throw new Error("STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
  }

  try {
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_CONNECT_WEBHOOK_SECRET,
    );
  } catch {
    return null;
  }
}

/**
 * Retrieve a Stripe charge to get amount, currency, and customer details.
 * Used when processing EFW events that only include a charge ID.
 * Supports automatic token refresh for connected accounts.
 */
export async function getChargeDetails(
  chargeId: string,
  stripeSecretKey?: string,
  stripeAccountId?: string,
): Promise<{
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  paymentIntent?: string;
  cardLast4?: string;
  cardBrand?: string;
} | null> {
  const fetchCharge = async (token?: string) => {
    const stripe = token
      ? new Stripe(token)
      : getStripeClient();

    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["customer"],
    });

    const card = charge.payment_method_details?.card;
    const customer = charge.customer as Stripe.Customer | null;

    return {
      amount: charge.amount,
      currency: charge.currency.toUpperCase(),
      customerId: typeof charge.customer === "string" ? charge.customer : customer?.id,
      customerEmail: customer?.email ?? charge.billing_details?.email ?? undefined,
      paymentIntent: typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : undefined,
      cardLast4: card?.last4 ?? undefined,
      cardBrand: card?.brand ?? undefined,
    };
  };

  try {
    if (stripeSecretKey && stripeAccountId) {
      return await withTokenRefresh(stripeAccountId, stripeSecretKey, fetchCharge);
    }
    return await fetchCharge(stripeSecretKey);
  } catch {
    return null;
  }
}
