import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PspConfig,
} from "@qarta/shared";
import { getAdapter } from "../providers/index.js";
import { PaymentRouter } from "./payment-router.js";

const router = new PaymentRouter();

/**
 * Main payment processing service.
 * Orchestrates provider selection, payment creation, and fallback logic.
 */
export async function processPayment(
  request: CreatePaymentRequest,
  merchantConfigs: PspConfig[],
): Promise<CreatePaymentResponse> {
  const decision = router.selectProvider(request, merchantConfigs);
  const adapter = getAdapter(decision.provider);

  const config = merchantConfigs.find(
    (c) => c.provider === decision.provider,
  );

  if (!config) {
    throw new Error(`No config for provider ${decision.provider}`);
  }

  try {
    const result = await adapter.createPayment(request, config.credentials);
    return result;
  } catch (error) {
    // Attempt fallback
    const fallback = router.selectFallback(decision.provider, merchantConfigs);

    if (fallback) {
      const fallbackAdapter = getAdapter(fallback.provider);
      const fallbackConfig = merchantConfigs.find(
        (c) => c.provider === fallback.provider,
      );

      if (fallbackConfig) {
        return fallbackAdapter.createPayment(
          request,
          fallbackConfig.credentials,
        );
      }
    }

    throw error;
  }
}
