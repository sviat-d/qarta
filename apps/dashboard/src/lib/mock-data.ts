import type {
  AlertSource,
  AlertStatus,
  DisputeReasonCategory,
} from "@qarta/shared";

// --- Mock alerts ---

export interface MockAlert {
  id: string;
  source: AlertSource;
  status: AlertStatus;
  amount: number;
  currency: string;
  reasonCategory: DisputeReasonCategory;
  customerEmail: string;
  customerId: string;
  cardLast4: string;
  cardBrand: string;
  isActionable: boolean;
  stripeChargeId: string;
  createdAt: string;
  resolvedAt?: string;
}

const sources: AlertSource[] = [
  "stripe_efw",
  "stripe_efw",
  "stripe_dispute",
  "stripe_efw",
  "stripe_dispute",
  "stripe_inquiry",
  "stripe_efw",
  "stripe_dispute",
  "stripe_efw",
  "stripe_efw",
];

const statuses: AlertStatus[] = [
  "auto_refunded",
  "auto_refunded",
  "auto_refunded",
  "escalated",
  "manually_resolved",
  "auto_refunded",
  "new",
  "dismissed",
  "auto_refunded",
  "auto_refunded",
];

const reasons: DisputeReasonCategory[] = [
  "fraudulent",
  "unrecognized",
  "fraudulent",
  "subscription_canceled",
  "product_not_received",
  "fraudulent",
  "unrecognized",
  "duplicate",
  "fraudulent",
  "general",
];

const emails = [
  "alice@company.com",
  "bob@startup.io",
  "carol@saas.dev",
  "dave@platform.co",
  "eve@agency.com",
  "frank@tools.io",
  "grace@app.dev",
  "henry@cloud.co",
  "iris@digital.com",
  "jake@tech.io",
];

const brands = ["visa", "mastercard", "amex", "visa", "mastercard"];

function generateAlerts(count: number): MockAlert[] {
  const alerts: MockAlert[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const source = sources[i % sources.length]!;
    const status = statuses[i % statuses.length]!;
    const email = emails[i % emails.length]!;
    const createdAt = new Date(
      now - i * 7200000 - Math.random() * 3600000,
    ).toISOString();

    const isResolved = [
      "auto_refunded",
      "manually_resolved",
      "dismissed",
    ].includes(status);

    alerts.push({
      id: `alt_${(1000 + i).toString(36)}${i.toString().padStart(4, "0")}`,
      source,
      status,
      amount: Math.floor(Math.random() * 25000 + 500),
      currency: "USD",
      reasonCategory: reasons[i % reasons.length]!,
      customerEmail: email,
      customerId: `cus_${i.toString().padStart(6, "0")}`,
      cardLast4: `${(4000 + i * 137) % 10000}`.padStart(4, "0"),
      cardBrand: brands[i % brands.length]!,
      isActionable: source === "stripe_efw",
      stripeChargeId: `ch_${Date.now().toString(36)}${i}`,
      createdAt,
      resolvedAt: isResolved
        ? new Date(
            new Date(createdAt).getTime() + Math.random() * 60000 + 5000,
          ).toISOString()
        : undefined,
    });
  }

  return alerts;
}

export const mockAlerts = generateAlerts(50);

// --- Mock outcomes metrics ---

export const mockOutcomes = {
  alertsTotal: 127,
  alertsAutoResolved: 89,
  alertsEscalated: 23,
  alertsDismissed: 12,
  alertsNew: 3,
  disputesAvoided: 89,
  disputeRateCurrent: 0.32,
  disputeRatePrevious: 0.71,
  totalRefunded: 156_400, // cents = $1,564
  feesAvoided: 133_500, // cents = $1,335 (89 * $15)
  automationRate: 70.1,
  avgResponseTime: 42000, // 42 seconds
};

// --- Mock chart data (last 30 days) ---

export function generateAlertChartData() {
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const alerts = Math.floor(2 + Math.random() * 6);
    const autoResolved = Math.floor(alerts * (0.6 + Math.random() * 0.3));
    const escalated = Math.floor(
      (alerts - autoResolved) * (0.3 + Math.random() * 0.4),
    );
    const disputeRate = 0.2 + Math.random() * 0.3;

    data.push({
      date: date.toISOString().split("T")[0]!,
      alerts,
      autoResolved,
      escalated,
      disputeRate: Math.round(disputeRate * 100) / 100,
    });
  }

  return data;
}

export const mockChartData = generateAlertChartData();

// --- Mock policies ---

export const mockPolicies = [
  {
    id: "pol_001",
    name: "Auto-refund small fraud alerts",
    enabled: true,
    priority: 1,
    conditions: "amount < $100 AND reason = fraudulent AND source = EFW",
    action: "Auto-refund",
    refundsToday: 3,
    maxPerDay: 25,
  },
  {
    id: "pol_002",
    name: "Escalate high-value alerts",
    enabled: true,
    priority: 2,
    conditions: "amount >= $100",
    action: "Escalate to manual review",
    refundsToday: 0,
    maxPerDay: 50,
  },
  {
    id: "pol_003",
    name: "Dismiss duplicate alerts",
    enabled: true,
    priority: 3,
    conditions: "reason = duplicate",
    action: "Dismiss",
    refundsToday: 1,
    maxPerDay: 100,
  },
];
