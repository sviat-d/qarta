import type {
  PspProvider,
  PspConfig,
  PaymentMethod,
  CreatePaymentRequest,
  CreatePaymentResponse,
  DeclineType,
} from "@qarta/shared";
import {
  SOFT_DECLINE_CODES,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
} from "@qarta/shared";
import { getAdapter } from "../providers/index.js";

interface RouteDecision {
  provider: PspProvider;
  reason: string;
}

/**
 * Smart payment router.
 * Decides which PSP to use based on payment method, merchant config,
 * provider health, and previous attempt results.
 */
export class PaymentRouter {
  /**
   * Select the best provider for a payment.
   */
  selectProvider(
    request: CreatePaymentRequest,
    configs: PspConfig[],
  ): RouteDecision {
    const enabledConfigs = configs
      .filter((c) => c.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (enabledConfigs.length === 0) {
      throw new Error("No enabled PSP configurations");
    }

    const method = request.method ?? "card";

    // Crypto payments → Coinbase Commerce
    if (method === "crypto") {
      const cryptoConfig = enabledConfigs.find(
        (c) => c.provider === "coinbase_commerce",
      );
      if (cryptoConfig) {
        return {
          provider: "coinbase_commerce",
          reason: "crypto_payment_method",
        };
      }
      throw new Error("No crypto provider configured");
    }

    // Card payments → highest priority card provider (Stripe)
    const cardConfig = enabledConfigs.find((c) => c.provider === "stripe");
    if (cardConfig) {
      return { provider: "stripe", reason: "primary_card_provider" };
    }

    // Fallback to first available
    return {
      provider: enabledConfigs[0]!.provider,
      reason: "fallback",
    };
  }

  /**
   * Determine if a decline is soft (retryable) or hard (terminal).
   */
  classifyDecline(declineCode: string): DeclineType {
    if (
      (SOFT_DECLINE_CODES as readonly string[]).includes(
        declineCode.toLowerCase(),
      )
    ) {
      return "soft";
    }
    return "hard";
  }

  /**
   * Get the delay before the next retry attempt.
   */
  getRetryDelay(attemptNumber: number): number | null {
    if (attemptNumber >= MAX_RETRY_ATTEMPTS) return null;
    return RETRY_DELAY_MS[attemptNumber] ?? null;
  }

  /**
   * Select a fallback provider after a failed attempt.
   */
  selectFallback(
    failedProvider: PspProvider,
    configs: PspConfig[],
  ): RouteDecision | null {
    const fallback = configs
      .filter((c) => c.enabled && c.provider !== failedProvider)
      .sort((a, b) => a.priority - b.priority)[0];

    if (!fallback) return null;

    return {
      provider: fallback.provider,
      reason: "fallback_after_decline",
    };
  }
}
