// ============================================================
// Qarta Payment Engine — Core Domain Types
// ============================================================

// --- PSP Providers ---

export type PspProvider = "stripe" | "coinbase_commerce";

export type PaymentMethod = "card" | "crypto";

export type CryptoCurrency = "USDT" | "USDC" | "BTC" | "ETH";

// --- Payment Status ---

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "disputed";

export type DeclineType = "hard" | "soft";

// --- Core Entities ---

export interface Merchant {
  id: string;
  name: string;
  apiKeyHash: string;
  pspConfigs: PspConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PspConfig {
  provider: PspProvider;
  enabled: boolean;
  priority: number;
  credentials: Record<string, string>;
}

export interface Payment {
  id: string;
  merchantId: string;
  externalId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider?: PspProvider;
  customerId?: string;
  metadata?: Record<string, unknown>;
  attempts: PaymentAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  provider: PspProvider;
  status: PaymentStatus;
  declineCode?: string;
  declineType?: DeclineType;
  providerTransactionId?: string;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  merchantId: string;
  customerId: string;
  planId: string;
  status: "active" | "past_due" | "canceled" | "paused";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chargeback {
  id: string;
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  reason: string;
  status: "open" | "under_review" | "won" | "lost";
  provider: PspProvider;
  providerDisputeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- API Request/Response ---

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  method?: PaymentMethod;
  customerId?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  id: string;
  status: PaymentStatus;
  clientSecret?: string;
  checkoutUrl?: string;
  provider: PspProvider;
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PspProvider;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// --- API Error ---

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
