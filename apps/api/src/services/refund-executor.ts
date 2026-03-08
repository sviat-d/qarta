import Stripe from "stripe";
import { getStripeClient, getStripeClientForAccount } from "./stripe.js";

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
 * Uses platform key with Stripe-Account header for connected accounts.
 */
export async function executeRefund(
  request: RefundRequest,
  stripeAccountId?: string,
): Promise<RefundResult> {
  try {
    const stripe = stripeAccountId
      ? getStripeClientForAccount(stripeAccountId)
      : getStripeClient();

    const refund = await stripe.refunds.create({
      charge: request.stripeChargeId,
      amount: request.amount,
      reason: "fraudulent", // Stripe accepts: duplicate, fraudulent, requested_by_customer
      metadata: {
        source: "qarta_auto_refund",
        original_reason: request.reason ?? "policy_match",
      },
    });

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
