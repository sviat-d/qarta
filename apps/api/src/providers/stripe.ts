import Stripe from "stripe";

/**
 * Stripe client factory.
 * Used by refund-executor and webhook verification.
 */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

/**
 * Verify a Stripe webhook signature.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  const stripe = new Stripe(webhookSecret);
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Look up a charge to get amount, currency, and customer details.
 * Needed when processing EFW alerts (which only contain charge ID).
 */
export async function getCharge(
  secretKey: string,
  chargeId: string,
): Promise<{
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  paymentIntentId?: string;
  cardLast4?: string;
  cardBrand?: string;
}> {
  const stripe = createStripeClient(secretKey);
  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ["customer"],
  });

  const card = charge.payment_method_details?.card;
  const customer = charge.customer as Stripe.Customer | null;

  return {
    amount: charge.amount,
    currency: charge.currency.toUpperCase(),
    customerId:
      typeof charge.customer === "string" ? charge.customer : customer?.id,
    customerEmail:
      customer?.email ?? charge.billing_details?.email ?? undefined,
    paymentIntentId:
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : undefined,
    cardLast4: card?.last4 ?? undefined,
    cardBrand: card?.brand ?? undefined,
  };
}
