import Stripe from "stripe";
import { config } from "../config.js";

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
 * Retrieve a Stripe charge to get amount, currency, and customer details.
 * Used when processing EFW events that only include a charge ID.
 */
export async function getChargeDetails(
  chargeId: string,
  stripeSecretKey?: string,
): Promise<{
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  paymentIntent?: string;
  cardLast4?: string;
  cardBrand?: string;
} | null> {
  try {
    const stripe = stripeSecretKey
      ? new Stripe(stripeSecretKey)
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
  } catch {
    return null;
  }
}
