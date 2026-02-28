import type {
  ApiResponse,
  PaginatedResponse,
  Alert,
  Policy,
  OutcomesMetrics,
  OutcomesTimeSeries,
  RefundAction,
} from "@qarta/shared";

// ─── Demo mode flag ───

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("qarta_demo") === "true";
}

export function enableDemoMode() {
  localStorage.setItem("qarta_demo", "true");
}

export function disableDemoMode() {
  localStorage.removeItem("qarta_demo");
}

// ─── Mock data ───

const now = new Date();

function daysAgo(n: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

function daysAgoStr(n: number): string {
  return daysAgo(n).toISOString();
}

function mockAlert(
  overrides: Partial<Alert> & Pick<Alert, "id" | "source" | "amount" | "reasonCategory" | "status" | "customerEmail">,
  createdDaysAgo: number,
  resolvedDaysAgo?: number,
): Alert {
  return {
    merchantId: "m_demo",
    currency: "usd",
    isActionable: true,
    metadata: {},
    updatedAt: daysAgo(resolvedDaysAgo ?? createdDaysAgo),
    createdAt: daysAgo(createdDaysAgo),
    resolvedAt: resolvedDaysAgo !== undefined ? daysAgo(resolvedDaysAgo) : undefined,
    ...overrides,
  };
}

const mockAlerts: Alert[] = [
  mockAlert({ id: "alt_1a2b3c4d", source: "stripe_efw", stripeChargeId: "ch_3PqR5tUvW", amount: 9900, reasonCategory: "fraudulent", customerEmail: "john@acmetech.co", customerId: "cus_NqR5tPa", cardBrand: "visa", cardLast4: "4242", status: "auto_refunded" }, 1, 1),
  mockAlert({ id: "alt_2e3f4g5h", source: "stripe_dispute", stripeChargeId: "ch_7XyZ8aB", amount: 24900, reasonCategory: "subscription_canceled", customerEmail: "sarah@startup.io", customerId: "cus_MxZ8aQ", cardBrand: "mastercard", cardLast4: "5555", status: "escalated" }, 2),
  mockAlert({ id: "alt_3i4j5k6l", source: "stripe_efw", stripeChargeId: "ch_9CdE0fG", amount: 4900, reasonCategory: "product_not_received", customerEmail: "mike@bigcorp.com", customerId: "cus_KdE0fR", cardBrand: "visa", cardLast4: "1234", status: "auto_refunded" }, 3, 3),
  mockAlert({ id: "alt_4m5n6o7p", source: "stripe_dispute", stripeChargeId: "ch_HiJ1kL", amount: 19900, reasonCategory: "duplicate", customerEmail: "anna@designstudio.co", customerId: "cus_HiJ1kS", cardBrand: "amex", cardLast4: "0005", status: "manually_resolved" }, 5, 4),
  mockAlert({ id: "alt_5q6r7s8t", source: "stripe_efw", stripeChargeId: "ch_MnO2pQ", amount: 7900, reasonCategory: "fraudulent", customerEmail: "tom@freelance.dev", customerId: "cus_MnO2pT", cardBrand: "visa", cardLast4: "9876", status: "auto_refunded" }, 6, 6),
  mockAlert({ id: "alt_6u7v8w9x", source: "stripe_inquiry", stripeChargeId: "ch_RsT3uV", amount: 14900, reasonCategory: "general", customerEmail: "lisa@enterprise.com", customerId: "cus_RsT3uL", cardBrand: "visa", cardLast4: "6789", status: "new" }, 0),
  mockAlert({ id: "alt_7y8z9a0b", source: "stripe_efw", stripeChargeId: "ch_WxY4zA", amount: 3900, reasonCategory: "fraudulent", customerEmail: "dave@smallbiz.co", customerId: "cus_WxY4zD", cardBrand: "mastercard", cardLast4: "3333", status: "dismissed", isActionable: false }, 7, 7),
  mockAlert({ id: "alt_8c9d0e1f", source: "stripe_dispute", stripeChargeId: "ch_BcD5eF", amount: 29900, reasonCategory: "subscription_canceled", customerEmail: "kate@agency.io", customerId: "cus_BcD5eK", cardBrand: "visa", cardLast4: "7777", status: "auto_refunded" }, 4, 4),
];

const mockPolicies: Policy[] = [
  {
    id: "pol_1",
    merchantId: "m_demo",
    name: "Auto-refund small EFW",
    priority: 1,
    conditions: [
      { field: "amount", operator: "lte", value: 10000 },
      { field: "source", operator: "eq", value: "stripe_efw" },
    ],
    action: { type: "auto_refund", cancelSubscription: false },
    safetyRails: {
      maxRefundsPerDay: 10,
      maxRefundsPerCustomer: 2,
      maxRefundAmount: 10000,
    },
    enabled: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
  },
  {
    id: "pol_2",
    merchantId: "m_demo",
    name: "Escalate high-value disputes",
    priority: 2,
    conditions: [
      { field: "amount", operator: "gt", value: 20000 },
      { field: "source", operator: "eq", value: "stripe_dispute" },
    ],
    action: { type: "escalate" },
    safetyRails: {
      maxRefundsPerDay: 5,
      maxRefundsPerCustomer: 1,
      maxRefundAmount: 50000,
    },
    enabled: true,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(10),
  },
  {
    id: "pol_3",
    merchantId: "m_demo",
    name: "Auto-refund subscription cancels",
    priority: 3,
    conditions: [
      { field: "reason_category", operator: "in", value: ["subscription_canceled", "product_not_received"] },
      { field: "amount", operator: "lte", value: 30000 },
    ],
    action: { type: "auto_refund", cancelSubscription: true },
    safetyRails: {
      maxRefundsPerDay: 15,
      maxRefundsPerCustomer: 3,
      maxRefundAmount: 30000,
    },
    enabled: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },
];

function generateTimeseries(): OutcomesTimeSeries[] {
  const data: OutcomesTimeSeries[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const alerts = Math.floor(Math.random() * 8) + 1;
    const autoResolved = Math.floor(alerts * (0.5 + Math.random() * 0.4));
    const escalated = alerts - autoResolved;
    data.push({
      date: d.toISOString().split("T")[0]!,
      alerts,
      autoResolved,
      escalated,
      disputeRate: 0.2 + Math.random() * 0.3,
    });
  }
  return data;
}

const mockTimeseries = generateTimeseries();

const mockOutcomes: OutcomesMetrics = {
  disputesAvoided: 47,
  disputeRateCurrent: 0.32,
  disputeRatePrevious: 0.81,
  feesAvoided: 42000,
  automationRate: 78,
  alertsTotal: 63,
  alertsAutoResolved: 47,
  alertsEscalated: 9,
  alertsDismissed: 7,
  totalRefunded: 115400,
  avgResponseTime: 2.3,
};

// ─── Demo API responses ───

export function getDemoResponse(path: string): unknown {
  if (path.startsWith("/v1/alerts/") && !path.includes("resolve")) {
    const id = path.split("/v1/alerts/")[1];
    const alert = mockAlerts.find((a) => a.id === id);
    return { data: alert ? { ...alert, actions: [] } : null };
  }

  if (path === "/v1/alerts") {
    return { data: mockAlerts, meta: { total: mockAlerts.length, page: 1, perPage: 15 } };
  }

  if (path === "/v1/policies") {
    return { data: mockPolicies, meta: { total: mockPolicies.length, page: 1, perPage: 20 } };
  }

  if (path === "/v1/outcomes") {
    return { data: mockOutcomes };
  }

  if (path === "/v1/outcomes/timeseries") {
    return { data: mockTimeseries };
  }

  if (path === "/v1/actions") {
    return { data: [], meta: { total: 0, page: 1, perPage: 15 } };
  }

  if (path === "/v1/connect/stripe/status") {
    return {
      data: {
        connected: true,
        stripeAccountId: "acct_1DemoQarta",
        livemode: false,
        connectedAt: daysAgoStr(30),
      },
    };
  }

  if (path === "/v1/auth/me") {
    return {
      data: {
        id: "m_demo",
        name: "Acme SaaS",
        email: "demo@acme-saas.com",
        stripeAccountId: "acct_1DemoQarta",
      },
    };
  }

  return { data: null };
}
