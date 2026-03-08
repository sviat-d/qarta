// ============================================================
// Qarta Chargeback Deflection — Constants
// ============================================================

// --- Alert Sources ---

export const ALERT_SOURCES = [
  "stripe_efw",
  "stripe_dispute",
  "stripe_inquiry",
  "manual",
] as const;

// --- Alert Statuses ---

export const ALERT_STATUSES = [
  "new",
  "evaluating",
  "auto_refunded",
  "escalated",
  "manually_resolved",
  "dismissed",
  "expired",
] as const;

// --- Dispute Reason Categories ---

export const DISPUTE_REASON_CATEGORIES = [
  "fraudulent",
  "unrecognized",
  "duplicate",
  "product_not_received",
  "product_unacceptable",
  "subscription_canceled",
  "general",
] as const;

// --- Stripe Reason → Category Mapping ---

export const STRIPE_REASON_TO_CATEGORY: Record<string, string> = {
  fraudulent: "fraudulent",
  unrecognized: "unrecognized",
  duplicate: "duplicate",
  product_not_received: "product_not_received",
  product_unacceptable: "product_unacceptable",
  subscription_canceled: "subscription_canceled",
  general: "general",
  credit_not_processed: "general",
  incorrect_account_details: "general",
  insufficient_funds: "general",
  bank_cannot_process: "general",
  debit_not_authorized: "general",
  customer_initiated: "general",
};

// --- Stripe Monitoring Thresholds ---

export const STRIPE_MONITORING_THRESHOLDS = {
  /** Stripe flags accounts above 0.75% dispute rate */
  disputeRate: 0.0075,
  /** Stripe VAMP programme escalation at 0.9% */
  fraudRate: 0.009,
  /** Desired safe zone — well below monitoring */
  safeDisputeRate: 0.005,
} as const;

// --- Default Safety Rails ---

export const DEFAULT_SAFETY_RAILS = {
  maxRefundsPerDay: 25,
  maxRefundsPerCustomer: 3,
  maxRefundAmount: 50000, // $500 in cents
} as const;

// --- Dispute Fee Estimates ---

export const DISPUTE_FEE_CENTS = {
  /** Stripe dispute fee */
  stripe: 1500, // $15
} as const;

// --- Alert Expiry ---

/** Hours before an unresolved alert expires */
export const ALERT_EXPIRY_HOURS = 48;

// --- Stripe Webhook Event Types We Care About ---

export const STRIPE_EVENTS_OF_INTEREST = [
  "radar.early_fraud_warning.created",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.refunded",
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

// --- Billing Plans ---

export const BILLING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    alertsPerMonth: 10,
    priceMonthly: 0,
    perDeflection: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    alertsPerMonth: -1, // unlimited
    priceMonthly: 19900, // $199 in cents
    perDeflection: 1500, // $15 in cents
  },
  growth: {
    id: "growth",
    name: "Growth",
    alertsPerMonth: -1,
    priceMonthly: 39900, // $399 in cents
    perDeflection: 1000, // $10 in cents (volume discount)
  },
} as const;

export type BillingPlanId = keyof typeof BILLING_PLANS;

// --- HTTP Status Codes ---

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
} as const;
