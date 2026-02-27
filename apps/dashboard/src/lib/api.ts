import type {
  ApiResponse,
  PaginatedResponse,
  Alert,
  Policy,
  RefundAction,
  OutcomesMetrics,
  OutcomesTimeSeries,
} from "@qarta/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Get stored API key from localStorage.
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("qarta_api_key");
}

/**
 * Store API key in localStorage.
 */
export function setApiKey(key: string) {
  localStorage.setItem("qarta_api_key", key);
}

/**
 * Clear stored API key (logout).
 */
export function clearApiKey() {
  localStorage.removeItem("qarta_api_key");
}

/**
 * Core fetch wrapper with auth and error handling.
 */
async function apiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> },
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ApiError("UNAUTHORIZED", "Not authenticated");
  }

  const url = new URL(`${API_BASE}${path}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const { params: _, ...fetchOptions } = options ?? {};

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...fetchOptions?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? "UNKNOWN_ERROR",
      data?.error?.message ?? `Request failed with status ${response.status}`,
    );
  }

  return data;
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

// ─── Alerts ───

export async function fetchAlerts(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  source?: string;
  search?: string;
}): Promise<PaginatedResponse<Alert>> {
  return apiFetch("/v1/alerts", { params: params as Record<string, string | number | undefined> });
}

export async function fetchAlert(id: string): Promise<ApiResponse<Alert & { actions: RefundAction[] }>> {
  return apiFetch(`/v1/alerts/${id}`);
}

export async function resolveAlert(
  id: string,
  body: { action: "refund" | "dismiss"; note?: string },
): Promise<ApiResponse<{ id: string; status: string }>> {
  return apiFetch(`/v1/alerts/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Policies ───

export async function fetchPolicies(): Promise<PaginatedResponse<Policy>> {
  return apiFetch("/v1/policies");
}

export async function createPolicy(body: {
  name: string;
  priority: number;
  conditions: { field: string; operator: string; value: string | number | string[] }[];
  action: { type: string; cancelSubscription?: boolean };
  safetyRails: { maxRefundsPerDay: number; maxRefundsPerCustomer: number; maxRefundAmount: number };
}): Promise<ApiResponse<{ id: string }>> {
  return apiFetch("/v1/policies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePolicy(
  id: string,
  body: Parameters<typeof createPolicy>[0],
): Promise<ApiResponse<{ id: string }>> {
  return apiFetch(`/v1/policies/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function togglePolicy(
  id: string,
  enabled: boolean,
): Promise<ApiResponse<{ id: string; enabled: boolean }>> {
  return apiFetch(`/v1/policies/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function deletePolicy(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
  return apiFetch(`/v1/policies/${id}`, { method: "DELETE" });
}

// ─── Outcomes ───

export async function fetchOutcomes(): Promise<ApiResponse<OutcomesMetrics>> {
  return apiFetch("/v1/outcomes");
}

export async function fetchTimeseries(days?: number): Promise<ApiResponse<OutcomesTimeSeries[]>> {
  return apiFetch("/v1/outcomes/timeseries", { params: { days } });
}

// ─── Actions ───

export async function fetchActions(params?: {
  page?: number;
  perPage?: number;
  status?: string;
}): Promise<PaginatedResponse<RefundAction>> {
  return apiFetch("/v1/actions", { params: params as Record<string, string | number | undefined> });
}

// ─── Connect ───

export async function fetchStripeStatus(): Promise<
  ApiResponse<{ connected: boolean; stripeAccountId: string | null; livemode: boolean; connectedAt: string | null }>
> {
  return apiFetch("/v1/connect/stripe/status");
}

export async function initiateStripeConnect(): Promise<ApiResponse<{ url: string; state: string }>> {
  return apiFetch("/v1/connect/stripe");
}
