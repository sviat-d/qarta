import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatus,
} from "@qarta/shared";
import type { PspAdapter } from "./base.js";

/**
 * Coinbase Commerce adapter for crypto payments (USDT, USDC, BTC, ETH).
 * Uses Coinbase Commerce API v2.
 */
export class CoinbaseCommerceAdapter implements PspAdapter {
  readonly name = "coinbase_commerce" as const;

  private readonly baseUrl = "https://api.commerce.coinbase.com";

  private headers(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
    };
  }

  async createPayment(
    request: CreatePaymentRequest,
    merchantConfig: Record<string, string>,
  ): Promise<CreatePaymentResponse> {
    const response = await fetch(`${this.baseUrl}/charges`, {
      method: "POST",
      headers: this.headers(merchantConfig["apiKey"]!),
      body: JSON.stringify({
        name: "Payment",
        description: `Payment of ${request.amount} ${request.currency}`,
        pricing_type: "fixed_price",
        local_price: {
          amount: request.amount.toString(),
          currency: request.currency,
        },
        metadata: request.metadata,
        redirect_url: request.returnUrl,
      }),
    });

    const data = (await response.json()) as {
      data: { id: string; hosted_url: string; timeline: { status: string }[] };
    };

    return {
      id: data.data.id,
      status: "pending",
      checkoutUrl: data.data.hosted_url,
      provider: "coinbase_commerce",
    };
  }

  async getPaymentStatus(
    providerTransactionId: string,
    merchantConfig: Record<string, string>,
  ): Promise<PaymentStatus> {
    const response = await fetch(
      `${this.baseUrl}/charges/${providerTransactionId}`,
      {
        headers: this.headers(merchantConfig["apiKey"]!),
      },
    );

    const data = (await response.json()) as {
      data: { timeline: { status: string }[] };
    };
    const lastStatus =
      data.data.timeline[data.data.timeline.length - 1]?.status;
    return this.mapStatus(lastStatus);
  }

  async refundPayment(): Promise<{ success: boolean; refundId?: string }> {
    // Coinbase Commerce doesn't support automatic refunds via API
    // Refunds must be done manually or via on-chain transfer
    return { success: false };
  }

  verifyWebhookSignature(
    _payload: string | Buffer,
    _signature: string,
    _secret: string,
  ): boolean {
    // TODO: Implement HMAC-SHA256 verification
    // See: https://docs.cloud.coinbase.com/commerce/docs/webhooks-security
    return true;
  }

  private mapStatus(coinbaseStatus?: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      NEW: "pending",
      PENDING: "processing",
      CONFIRMED: "succeeded",
      COMPLETED: "succeeded",
      EXPIRED: "failed",
      CANCELED: "failed",
      UNRESOLVED: "pending",
      RESOLVED: "succeeded",
    };
    return (coinbaseStatus && statusMap[coinbaseStatus]) ?? "pending";
  }
}
