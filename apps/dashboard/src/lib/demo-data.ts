import type {
  Alert,
  Policy,
  OutcomesMetrics,
  OutcomesTimeSeries,
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

// ─── Helpers ───

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
  overrides: Partial<Alert> &
    Pick<Alert, "id" | "source" | "amount" | "reasonCategory" | "status" | "customerEmail">,
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
    resolvedAt:
      resolvedDaysAgo !== undefined ? daysAgo(resolvedDaysAgo) : undefined,
    ...overrides,
  };
}

// ─── 20 realistic mock alerts ───

const mockAlerts: Alert[] = [
  mockAlert({ id: "alt_a1b2c3", source: "stripe_inquiry", stripeChargeId: "ch_RsT3uV", amount: 14900, reasonCategory: "general", customerEmail: "lisa@enterprise.com", customerId: "cus_RsT3uL", cardBrand: "visa", cardLast4: "6789", status: "new" }, 0),
  mockAlert({ id: "alt_d4e5f6", source: "stripe_efw", stripeChargeId: "ch_3PqR5tUvW", amount: 9900, reasonCategory: "fraudulent", customerEmail: "john@acmetech.co", customerId: "cus_NqR5tPa", cardBrand: "visa", cardLast4: "4242", status: "auto_refunded" }, 1, 1),
  mockAlert({ id: "alt_g7h8i9", source: "stripe_efw", stripeChargeId: "ch_Kl4mN5o", amount: 4900, reasonCategory: "fraudulent", customerEmail: "mike@bigcorp.com", customerId: "cus_KdE0fR", cardBrand: "visa", cardLast4: "1234", status: "auto_refunded" }, 1, 1),
  mockAlert({ id: "alt_j0k1l2", source: "stripe_efw", stripeChargeId: "ch_Pq6rS7t", amount: 7900, reasonCategory: "product_not_received", customerEmail: "tom@freelance.dev", customerId: "cus_MnO2pT", cardBrand: "mastercard", cardLast4: "9876", status: "auto_refunded" }, 2, 2),
  mockAlert({ id: "alt_m3n4o5", source: "stripe_dispute", stripeChargeId: "ch_7XyZ8aB", amount: 24900, reasonCategory: "subscription_canceled", customerEmail: "sarah@startup.io", customerId: "cus_MxZ8aQ", cardBrand: "mastercard", cardLast4: "5555", status: "escalated" }, 2),
  mockAlert({ id: "alt_p6q7r8", source: "stripe_dispute", stripeChargeId: "ch_Uv8wX9y", amount: 34900, reasonCategory: "fraudulent", customerEmail: "frank@bigco.com", customerId: "cus_Uv8wXF", cardBrand: "amex", cardLast4: "0005", status: "escalated" }, 3),
  mockAlert({ id: "alt_s9t0u1", source: "stripe_efw", stripeChargeId: "ch_Ab1cD2e", amount: 2900, reasonCategory: "fraudulent", customerEmail: "emma@store.co", customerId: "cus_Ab1cDE", cardBrand: "visa", cardLast4: "3456", status: "auto_refunded" }, 3, 3),
  mockAlert({ id: "alt_v2w3x4", source: "stripe_efw", stripeChargeId: "ch_Fg3hI4j", amount: 19900, reasonCategory: "subscription_canceled", customerEmail: "noah@saas.io", customerId: "cus_Fg3hIN", cardBrand: "visa", cardLast4: "7890", status: "auto_refunded" }, 4, 4),
  mockAlert({ id: "alt_y5z6a7", source: "stripe_dispute", stripeChargeId: "ch_BcD5eF", amount: 29900, reasonCategory: "subscription_canceled", customerEmail: "kate@agency.io", customerId: "cus_BcD5eK", cardBrand: "visa", cardLast4: "7777", status: "auto_refunded" }, 4, 4),
  mockAlert({ id: "alt_b8c9d0", source: "stripe_efw", stripeChargeId: "ch_Kl5mN6o", amount: 5900, reasonCategory: "product_not_received", customerEmail: "alex@design.co", customerId: "cus_Kl5mNA", cardBrand: "mastercard", cardLast4: "2222", status: "auto_refunded" }, 5, 5),
  mockAlert({ id: "alt_e1f2g3", source: "stripe_efw", stripeChargeId: "ch_Qr7sT8u", amount: 3900, reasonCategory: "fraudulent", customerEmail: "dave@smallbiz.co", customerId: "cus_WxY4zD", cardBrand: "mastercard", cardLast4: "3333", status: "auto_refunded" }, 5, 5),
  mockAlert({ id: "alt_h4i5j6", source: "stripe_inquiry", stripeChargeId: "ch_Vw9xY0z", amount: 12900, reasonCategory: "duplicate", customerEmail: "olivia@tech.io", customerId: "cus_Vw9xYO", cardBrand: "visa", cardLast4: "4444", status: "auto_refunded" }, 6, 6),
  mockAlert({ id: "alt_k7l8m9", source: "stripe_dispute", stripeChargeId: "ch_HiJ1kL", amount: 19900, reasonCategory: "duplicate", customerEmail: "anna@designstudio.co", customerId: "cus_HiJ1kS", cardBrand: "amex", cardLast4: "0005", status: "manually_resolved" }, 7, 5),
  mockAlert({ id: "alt_n0o1p2", source: "stripe_dispute", stripeChargeId: "ch_Cd2eF3g", amount: 44900, reasonCategory: "general", customerEmail: "james@corp.com", customerId: "cus_Cd2eFJ", cardBrand: "visa", cardLast4: "8888", status: "manually_resolved" }, 10, 8),
  mockAlert({ id: "alt_q3r4s5", source: "stripe_efw", stripeChargeId: "ch_Hi4jK5l", amount: 1900, reasonCategory: "fraudulent", customerEmail: "bot@spam.net", customerId: "cus_Hi4jKB", cardBrand: "visa", cardLast4: "0001", status: "dismissed", isActionable: false }, 8, 8),
  mockAlert({ id: "alt_t6u7v8", source: "stripe_inquiry", stripeChargeId: "ch_Mn6oP7q", amount: 9900, reasonCategory: "general", customerEmail: "test@example.com", customerId: "cus_Mn6oPT", cardBrand: "mastercard", cardLast4: "9999", status: "dismissed", isActionable: false }, 12, 12),
  mockAlert({ id: "alt_w9x0y1", source: "stripe_efw", stripeChargeId: "ch_Rs8tU9v", amount: 6900, reasonCategory: "product_not_received", customerEmail: "sophia@edtech.com", customerId: "cus_Rs8tUS", cardBrand: "visa", cardLast4: "5678", status: "auto_refunded" }, 14, 14),
  mockAlert({ id: "alt_z2a3b4", source: "stripe_efw", stripeChargeId: "ch_Wx0yZ1a", amount: 11900, reasonCategory: "fraudulent", customerEmail: "liam@creator.co", customerId: "cus_Wx0yZL", cardBrand: "visa", cardLast4: "1111", status: "auto_refunded" }, 18, 18),
  mockAlert({ id: "alt_c5d6e7", source: "stripe_dispute", stripeChargeId: "ch_Bc2dE3f", amount: 39900, reasonCategory: "subscription_canceled", customerEmail: "mia@startup.com", customerId: "cus_Bc2dEM", cardBrand: "mastercard", cardLast4: "6666", status: "auto_refunded" }, 21, 21),
  mockAlert({ id: "alt_f8g9h0", source: "stripe_efw", stripeChargeId: "ch_Fg4hI5j", amount: 8900, reasonCategory: "duplicate", customerEmail: "ethan@shop.co", customerId: "cus_Fg4hIE", cardBrand: "visa", cardLast4: "2345", status: "auto_refunded" }, 25, 25),
];

// ─── Policies ───

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
    safetyRails: { maxRefundsPerDay: 10, maxRefundsPerCustomer: 2, maxRefundAmount: 10000 },
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
    safetyRails: { maxRefundsPerDay: 5, maxRefundsPerCustomer: 1, maxRefundAmount: 50000 },
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
    safetyRails: { maxRefundsPerDay: 15, maxRefundsPerCustomer: 3, maxRefundAmount: 30000 },
    enabled: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },
];

// ─── Timeseries (30 days) ───

function generateTimeseries(): OutcomesTimeSeries[] {
  const data: OutcomesTimeSeries[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const alerts = Math.floor(Math.random() * 6) + 3;
    const autoResolved = Math.floor(alerts * (0.6 + Math.random() * 0.3));
    const escalated = alerts - autoResolved;
    data.push({
      date: d.toISOString().split("T")[0]!,
      alerts,
      autoResolved,
      escalated,
      disputeRate: 0.2 + Math.random() * 0.25,
    });
  }
  return data;
}

const mockTimeseries = generateTimeseries();

// ─── Outcomes metrics ───

const mockOutcomes: OutcomesMetrics = {
  disputesAvoided: 167,
  disputeRateCurrent: 0.32,
  disputeRatePrevious: 0.89,
  feesAvoided: 585000,
  automationRate: 91,
  alertsTotal: 184,
  alertsAutoResolved: 167,
  alertsEscalated: 11,
  alertsDismissed: 6,
  totalRefunded: 4512156,
  avgResponseTime: 1.8,
};

// ─── Demo API responses ───

export function getDemoResponse(path: string): unknown {
  if (path.startsWith("/v1/alerts/") && !path.includes("resolve")) {
    const id = path.split("/v1/alerts/")[1];
    const alert = mockAlerts.find((a) => a.id === id);
    return { data: alert ? { ...alert, actions: [] } : null };
  }

  if (path === "/v1/alerts") {
    return {
      data: mockAlerts,
      meta: { total: mockAlerts.length, page: 1, perPage: 20 },
    };
  }

  if (path === "/v1/policies") {
    return {
      data: mockPolicies,
      meta: { total: mockPolicies.length, page: 1, perPage: 20 },
    };
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
        name: "Demo Company",
        email: "demo@qarta.eu",
        stripeAccountId: "acct_1DemoQarta",
      },
    };
  }

  if (path === "/v1/notifications") {
    return {
      data: {
        slackWebhookUrl: null,
        slackEnabled: false,
        emailAddress: "demo@qarta.eu",
        emailEnabled: true,
        notifyNewAlert: true,
        notifyAutoRefund: true,
        notifyEscalated: true,
        notifyDailySummary: true,
      },
    };
  }

  if (path === "/v1/billing") {
    return {
      data: {
        plan: "free",
        planDetails: { id: "free", name: "Free", alertsPerMonth: 10, priceMonthly: 0, perDeflection: 0 },
        status: "active",
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }

  return { data: null };
}
