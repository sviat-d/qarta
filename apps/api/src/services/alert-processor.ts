import type { AlertSource, DisputeReasonCategory } from "@qarta/shared";
import { STRIPE_REASON_TO_CATEGORY } from "@qarta/shared";

interface RawStripeEfw {
  id: string;
  actionable: boolean;
  charge: string;
  payment_intent?: string;
  created: number;
}

interface RawStripeDispute {
  id: string;
  charge: string;
  payment_intent?: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
}

export interface ParsedAlert {
  source: AlertSource;
  stripeChargeId: string;
  stripePaymentIntentId?: string;
  stripeDisputeId?: string;
  stripeEfwId?: string;
  amount: number;
  currency: string;
  reasonCategory: DisputeReasonCategory;
  reasonRaw?: string;
  isActionable: boolean;
}

/**
 * Parse a Stripe Early Fraud Warning into an alert.
 * EFWs are the strongest pre-dispute signal — if actionable,
 * a proactive refund can prevent the dispute entirely.
 */
export function parseEarlyFraudWarning(
  efw: RawStripeEfw,
  chargeAmount: number,
  chargeCurrency: string,
): ParsedAlert {
  return {
    source: "stripe_efw",
    stripeChargeId: efw.charge,
    stripePaymentIntentId: efw.payment_intent,
    stripeEfwId: efw.id,
    amount: chargeAmount,
    currency: chargeCurrency,
    reasonCategory: "fraudulent",
    reasonRaw: "early_fraud_warning",
    isActionable: efw.actionable,
  };
}

/**
 * Parse a Stripe dispute event into an alert.
 */
export function parseDispute(dispute: RawStripeDispute): ParsedAlert {
  const category =
    (STRIPE_REASON_TO_CATEGORY[dispute.reason] as DisputeReasonCategory) ??
    "general";

  return {
    source: "stripe_dispute",
    stripeChargeId: dispute.charge,
    stripePaymentIntentId: dispute.payment_intent,
    stripeDisputeId: dispute.id,
    amount: dispute.amount,
    currency: dispute.currency.toUpperCase(),
    reasonCategory: category,
    reasonRaw: dispute.reason,
    isActionable: dispute.status === "needs_response",
  };
}

/**
 * Map a Stripe dispute reason string to our category.
 */
export function mapReasonCategory(reason: string): DisputeReasonCategory {
  return (
    (STRIPE_REASON_TO_CATEGORY[reason] as DisputeReasonCategory) ?? "general"
  );
}
