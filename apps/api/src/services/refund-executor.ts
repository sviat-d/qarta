import Stripe from "stripe";

export interface RefundRequest {
  stripeChargeId: string;
  amount?: number; // cents — undefined = full refund
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  stripeRefundId?: string;
  failureReason?: string;
}

/**
 * Execute a refund via Stripe Refunds API.
 * This is the core action that prevents a dispute from becoming a chargeback.
 * Every refund must be logged in the audit trail.
 *
 * Pass stripeAccount for Stripe Connect (Standard accounts).
 */
export async function executeRefund(
  stripeSecretKey: string,
  request: RefundRequest,
  stripeAccount?: string,
): Promise<RefundResult> {
  const stripe = new Stripe(stripeSecretKey);

  try {
    const refund = await stripe.refunds.create(
      {
        charge: request.stripeChargeId,
        amount: request.amount,
        reason: "fraudulent", // Stripe accepts: duplicate, fraudulent, requested_by_customer
        metadata: {
          source: "qarta_auto_refund",
          original_reason: request.reason ?? "policy_match",
        },
      },
      stripeAccount ? { stripeAccount } : undefined,
    );

    return {
      success: refund.status === "succeeded" || refund.status === "pending",
      stripeRefundId: refund.id,
    };
  } catch (error) {
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Unknown refund error";

    return {
      success: false,
      failureReason: message,
    };
  }
}
