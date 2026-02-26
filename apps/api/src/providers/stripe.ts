import Stripe from "stripe";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatus,
} from "@qarta/shared";
import type { PspAdapter } from "./base.js";

export class StripeAdapter implements PspAdapter {
  readonly name = "stripe" as const;

  private getClient(secretKey: string): Stripe {
    return new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" });
  }

  async createPayment(
    request: CreatePaymentRequest,
    merchantConfig: Record<string, string>,
  ): Promise<CreatePaymentResponse> {
    const stripe = this.getClient(merchantConfig["secretKey"]!);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Stripe uses cents
      currency: request.currency.toLowerCase(),
      customer: request.customerId,
      metadata: request.metadata as Record<string, string>,
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      clientSecret: paymentIntent.client_secret ?? undefined,
      provider: "stripe",
    };
  }

  async getPaymentStatus(
    providerTransactionId: string,
    merchantConfig: Record<string, string>,
  ): Promise<PaymentStatus> {
    const stripe = this.getClient(merchantConfig["secretKey"]!);
    const pi = await stripe.paymentIntents.retrieve(providerTransactionId);
    return this.mapStatus(pi.status);
  }

  async refundPayment(
    providerTransactionId: string,
    amount: number | undefined,
    merchantConfig: Record<string, string>,
  ): Promise<{ success: boolean; refundId?: string }> {
    const stripe = this.getClient(merchantConfig["secretKey"]!);

    const refund = await stripe.refunds.create({
      payment_intent: providerTransactionId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return { success: refund.status === "succeeded", refundId: refund.id };
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const stripe = new Stripe(secret);
      stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch {
      return false;
    }
  }

  private mapStatus(
    stripeStatus: Stripe.PaymentIntent.Status,
  ): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending",
      processing: "processing",
      requires_capture: "processing",
      canceled: "failed",
      succeeded: "succeeded",
    };
    return statusMap[stripeStatus] ?? "pending";
  }
}
