import type {
  PspProvider,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatus,
} from "@qarta/shared";

/**
 * Base interface for all PSP provider adapters.
 * Each provider (Stripe, Coinbase Commerce, etc.) implements this interface.
 */
export interface PspAdapter {
  readonly name: PspProvider;

  createPayment(
    request: CreatePaymentRequest,
    merchantConfig: Record<string, string>,
  ): Promise<CreatePaymentResponse>;

  getPaymentStatus(
    providerTransactionId: string,
    merchantConfig: Record<string, string>,
  ): Promise<PaymentStatus>;

  refundPayment(
    providerTransactionId: string,
    amount: number | undefined,
    merchantConfig: Record<string, string>,
  ): Promise<{ success: boolean; refundId?: string }>;

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean;
}
