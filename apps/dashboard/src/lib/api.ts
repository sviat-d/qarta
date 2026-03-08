import type {
  ApiResponse,
  PaginatedResponse,
  Alert,
  Policy,
  RefundAction,
  OutcomesMetrics,
  OutcomesTimeSeries,
} from "@qarta/shared";
import { isDemoMode, getDemoResponse } from "./demo-data";

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
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 300));
    return getDemoResponse(path) as T;
  }

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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...fetchOptions?.headers as Record<string, string>,
  };
  // Only set Content-Type for requests with a body
  if (fetchOptions?.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
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

// ─── Auth ───

export async function registerMerchant(body: {
  name: string;
  email: string;
  password: string;
}): Promise<ApiResponse<{ merchantId: string; name: string; email: string; apiKey: string }>> {
  const response = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? "UNKNOWN_ERROR",
      data?.error?.message ?? "Registration failed",
    );
  }
  return data;
}

export async function loginMerchant(body: {
  email: string;
  password: string;
}): Promise<ApiResponse<{ apiKey: string; merchant: { id: string; name: string; email: string; stripeAccountId: string | null } }>> {
  const response = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? "UNKNOWN_ERROR",
      data?.error?.message ?? "Login failed",
    );
  }
  return data;
}

export async function forgotPassword(body: {
  email: string;
}): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? "UNKNOWN_ERROR",
      data?.error?.message ?? "Request failed",
    );
  }
  return data;
}

export async function resetPassword(body: {
  token: string;
  password: string;
}): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${API_BASE}/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? "UNKNOWN_ERROR",
      data?.error?.message ?? "Password reset failed",
    );
  }
  return data;
}

export async function fetchMe(): Promise<
  ApiResponse<{ id: string; name: string; email: string; stripeAccountId: string | null }>
> {
  return apiFetch("/v1/auth/me");
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

export async function initiateStripeConnect(): Promise<ApiResponse<{ url: string }>> {
  return apiFetch("/v1/connect/stripe/onboard", { method: "POST" });
}

// ─── Notifications ───

export interface NotificationSettings {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  emailAddress: string | null;
  emailEnabled: boolean;
  notifyNewAlert: boolean;
  notifyAutoRefund: boolean;
  notifyEscalated: boolean;
  notifyDailySummary: boolean;
}

export async function fetchNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
  return apiFetch("/v1/notifications");
}

export async function updateNotificationSettings(
  body: Partial<NotificationSettings>,
): Promise<ApiResponse<{ updated: boolean }>> {
  return apiFetch("/v1/notifications", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function testSlackWebhook(): Promise<ApiResponse<{ sent: boolean }>> {
  return apiFetch("/v1/notifications/test-slack", { method: "POST" });
}

// ─── Billing ───

export interface BillingData {
  plan: string;
  planDetails: { id: string; name: string; alertsPerMonth: number; priceMonthly: number; perDeflection: number };
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function fetchBilling(): Promise<ApiResponse<BillingData>> {
  return apiFetch("/v1/billing");
}

export async function createCheckout(plan: "pro" | "growth"): Promise<ApiResponse<{ url: string; sessionId: string }>> {
  return apiFetch("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function createBillingPortal(): Promise<ApiResponse<{ url: string }>> {
  return apiFetch("/v1/billing/portal", { method: "POST" });
}
