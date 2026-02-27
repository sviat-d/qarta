// ============================================================
// Qarta Chargeback Deflection — Core Domain Types
// ============================================================

// --- Alert Sources ---

export type AlertSource =
  | "stripe_efw"          // Stripe Early Fraud Warning
  | "stripe_dispute"      // Stripe dispute event
  | "stripe_inquiry"      // Stripe inquiry (pre-dispute)
  | "manual";             // Manually created alert

// --- Alert Status ---

export type AlertStatus =
  | "new"                 // Just ingested, not yet evaluated
  | "evaluating"          // Policy engine is processing
  | "auto_refunded"       // Auto-refund executed by policy
  | "escalated"           // Sent to manual review queue
  | "manually_resolved"   // Resolved by operator
  | "dismissed"           // Dismissed (no action needed)
  | "expired";            // Timed out without action

// --- Dispute Reason Categories ---

export type DisputeReasonCategory =
  | "fraudulent"
  | "unrecognized"
  | "duplicate"
  | "product_not_received"
  | "product_unacceptable"
  | "subscription_canceled"
  | "general";

// --- Refund Action Status ---

export type RefundActionStatus =
  | "pending"
  | "executed"
  | "failed"
  | "skipped";            // Skipped due to safety rails

// --- Policy Rule Operator ---

export type PolicyOperator = "lt" | "lte" | "gt" | "gte" | "eq" | "in";

// --- Core Entities ---

export interface Merchant {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  apiKeyHash: string;
  stripeAccountId?: string;
  onboardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeConnection {
  id: string;
  merchantId: string;
  stripeAccountId: string;
  accessToken: string;
  refreshToken?: string;
  scope: string;
  livemode: boolean;
  connectedAt: Date;
}

export interface Alert {
  id: string;
  merchantId: string;
  source: AlertSource;
  status: AlertStatus;
  stripeChargeId?: string;
  stripePaymentIntentId?: string;
  stripeDisputeId?: string;
  stripeEfwId?: string;
  amount: number;           // cents
  currency: string;
  reasonCategory: DisputeReasonCategory;
  reasonRaw?: string;       // raw reason from Stripe
  customerEmail?: string;
  customerId?: string;
  cardLast4?: string;
  cardBrand?: string;
  isActionable: boolean;    // EFW actionable flag
  metadata?: Record<string, unknown>;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Policy {
  id: string;
  merchantId: string;
  name: string;
  enabled: boolean;
  priority: number;         // lower = evaluated first
  conditions: PolicyCondition[];
  action: PolicyAction;
  safetyRails: SafetyRails;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  field: "amount" | "reason_category" | "source" | "card_brand" | "is_actionable";
  operator: PolicyOperator;
  value: string | number | string[];
}

export interface PolicyAction {
  type: "auto_refund" | "escalate" | "dismiss";
  cancelSubscription?: boolean;
}

export interface SafetyRails {
  maxRefundsPerDay: number;
  maxRefundsPerCustomer: number;
  maxRefundAmount: number;  // cents — won't auto-refund above this
}

export interface RefundAction {
  id: string;
  alertId: string;
  merchantId: string;
  policyId?: string;        // null if manual
  status: RefundActionStatus;
  refundAmount: number;     // cents
  currency: string;
  stripeRefundId?: string;
  stripeChargeId: string;
  canceledSubscription: boolean;
  failureReason?: string;
  executedAt?: Date;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  merchantId: string;
  alertId?: string;
  actionId?: string;
  actor: "system" | "user";
  event: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  stripeEventId: string;
  type: string;
  payload: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
}

// --- Dashboard / Outcomes ---

export interface OutcomesMetrics {
  alertsTotal: number;
  alertsAutoResolved: number;
  alertsEscalated: number;
  alertsDismissed: number;
  disputesAvoided: number;
  disputeRateCurrent: number;
  disputeRatePrevious: number;
  totalRefunded: number;    // cents
  feesAvoided: number;      // cents (disputes avoided * avg dispute fee)
  automationRate: number;   // percentage
  avgResponseTime: number;  // milliseconds
}

export interface OutcomesTimeSeries {
  date: string;
  alerts: number;
  autoResolved: number;
  escalated: number;
  disputeRate: number;
}

// --- API Request/Response ---

export interface CreatePolicyRequest {
  name: string;
  priority: number;
  conditions: PolicyCondition[];
  action: PolicyAction;
  safetyRails: SafetyRails;
}

export interface ResolveAlertRequest {
  action: "refund" | "dismiss";
  note?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}
