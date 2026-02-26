// ============================================================
// Qarta Payment Engine — Constants
// ============================================================

export const PSP_PROVIDERS = ["stripe", "coinbase_commerce"] as const;

export const PAYMENT_METHODS = ["card", "crypto"] as const;

export const SUPPORTED_FIAT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
] as const;

export const SUPPORTED_CRYPTO_CURRENCIES = [
  "USDT",
  "USDC",
  "BTC",
  "ETH",
] as const;

export const MAX_RETRY_ATTEMPTS = 3;

export const RETRY_DELAY_MS = [2000, 5000, 15000] as const;

export const SOFT_DECLINE_CODES = [
  "insufficient_funds",
  "processing_error",
  "try_again_later",
  "card_velocity_exceeded",
  "do_not_honor",
] as const;

export const HARD_DECLINE_CODES = [
  "stolen_card",
  "lost_card",
  "expired_card",
  "invalid_account",
  "card_declined",
  "fraudulent",
] as const;

export const CHARGEBACK_REASON_CODES = {
  fraudulent: "10.4",
  duplicate: "11.1",
  product_not_received: "13.1",
  product_unacceptable: "13.3",
  subscription_canceled: "13.7",
} as const;

export const STRIPE_MONITORING_THRESHOLDS = {
  disputeRate: 0.0075,
  fraudRate: 0.009,
} as const;

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
