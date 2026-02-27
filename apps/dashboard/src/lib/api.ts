import type {
  Alert,
  Policy,
  OutcomesMetrics,
  OutcomesTimeSeries,
  ApiResponse,
  PaginatedResponse,
} from "@qarta/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// --- Token management ---

const TOKEN_KEY = "qarta_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// --- HTTP client ---

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }

  return body;
}

// --- Auth ---

export interface LoginResponse {
  success: boolean;
  data: {
    merchant: {
      id: string;
      name: string;
      email: string;
      stripeAccountId?: string;
      onboardedAt?: string;
      createdAt: string;
    };
    token: string;
  };
}

export interface SignupResponse {
  success: boolean;
  data: {
    merchant: {
      id: string;
      name: string;
      email: string;
    };
    token: string;
    apiKey: string;
  };
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await request<LoginResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(res.data.token);
  return res;
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<SignupResponse> {
  const res = await request<SignupResponse>("/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  setToken(res.data.token);
  return res;
}

export async function getMe(): Promise<
  ApiResponse<{
    id: string;
    name: string;
    email: string;
    stripeAccountId?: string;
    onboardedAt?: string;
    createdAt: string;
  }>
> {
  return request("/v1/auth/me");
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// --- Alerts ---

export async function getAlerts(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<Alert>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.perPage) query.set("perPage", String(params.perPage));
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return request(`/v1/alerts${qs ? `?${qs}` : ""}`);
}

export async function getAlert(id: string): Promise<ApiResponse<Alert>> {
  return request(`/v1/alerts/${id}`);
}

export async function resolveAlert(
  id: string,
  action: "refund" | "dismiss",
  note?: string,
): Promise<ApiResponse<{ id: string; status: string }>> {
  return request(`/v1/alerts/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}

// --- Policies ---

export async function getPolicies(): Promise<PaginatedResponse<Policy>> {
  return request("/v1/policies");
}

export async function createPolicy(policy: {
  name: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: string | number | string[];
  }>;
  action: { type: string; cancelSubscription?: boolean };
  safetyRails: {
    maxRefundsPerDay: number;
    maxRefundsPerCustomer: number;
    maxRefundAmount: number;
  };
}): Promise<ApiResponse<{ id: string }>> {
  return request("/v1/policies", {
    method: "POST",
    body: JSON.stringify(policy),
  });
}

export async function deletePolicy(
  id: string,
): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
  return request(`/v1/policies/${id}`, { method: "DELETE" });
}

// --- Outcomes ---

export async function getOutcomes(): Promise<ApiResponse<OutcomesMetrics>> {
  return request("/v1/outcomes");
}

export async function getTimeseries(): Promise<
  ApiResponse<OutcomesTimeSeries[]>
> {
  return request("/v1/outcomes/timeseries");
}

// --- API Keys ---

export async function regenerateApiKey(): Promise<
  ApiResponse<{ apiKey: string }>
> {
  return request("/v1/auth/api-keys/regenerate", { method: "POST" });
}

// --- Stripe Connect ---

export async function initiateStripeConnect(
  merchantId: string,
): Promise<ApiResponse<{ url: string; stripeAccountId: string }>> {
  return request("/v1/connect/stripe", {
    method: "POST",
    body: JSON.stringify({ merchantId }),
  });
}
