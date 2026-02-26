import type { PspProvider } from "@qarta/shared";
import type { PspAdapter } from "./base.js";
import { StripeAdapter } from "./stripe.js";
import { CoinbaseCommerceAdapter } from "./coinbase.js";

export type { PspAdapter } from "./base.js";

const adapters: Record<PspProvider, PspAdapter> = {
  stripe: new StripeAdapter(),
  coinbase_commerce: new CoinbaseCommerceAdapter(),
};

export function getAdapter(provider: PspProvider): PspAdapter {
  return adapters[provider];
}

export function getAllAdapters(): PspAdapter[] {
  return Object.values(adapters);
}
