import type { PaymentStatus, PspProvider, PaymentMethod } from "@qarta/shared";

// --- Mock payments ---

export interface MockPayment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PspProvider;
  customerId: string;
  customerEmail: string;
  createdAt: string;
  declineCode?: string;
}

const statuses: PaymentStatus[] = [
  "succeeded",
  "succeeded",
  "succeeded",
  "succeeded",
  "succeeded",
  "failed",
  "pending",
  "processing",
  "refunded",
  "disputed",
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

function generatePayments(count: number): MockPayment[] {
  const payments: MockPayment[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length]!;
    const isCrypto = i % 7 === 0;
    const email = emails[i % emails.length]!;

    payments.push({
      id: `pay_${(1000 + i).toString(36)}${i.toString().padStart(4, "0")}`,
      amount: Math.floor(Math.random() * 50000 + 500),
      currency: "USD",
      status,
      method: isCrypto ? "crypto" : "card",
      provider: isCrypto ? "coinbase_commerce" : "stripe",
      customerId: `cus_${i.toString().padStart(6, "0")}`,
      customerEmail: email,
      createdAt: new Date(now - i * 3600000 - Math.random() * 3600000).toISOString(),
      declineCode: status === "failed" ? "insufficient_funds" : undefined,
    });
  }

  return payments;
}

export const mockPayments = generatePayments(50);

// --- Mock metrics ---

export const mockMetrics = {
  totalRevenue: 284_750_00, // cents
  approvalRate: 94.2,
  chargebackRate: 0.3,
  totalPayments: 3847,
  successfulPayments: 3624,
  failedPayments: 158,
  pendingPayments: 65,
  disputedPayments: 12,
  revenueChange: 12.5,
  approvalRateChange: 1.8,
  chargebackRateChange: -0.2,
  paymentsChange: 8.3,
};

// --- Mock chart data (last 30 days) ---

export function generateChartData() {
  const data = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const base = 8000 + Math.random() * 4000;
    const succeeded = Math.floor(base * (0.9 + Math.random() * 0.08));
    const failed = Math.floor(base * (0.02 + Math.random() * 0.04));

    data.push({
      date: date.toISOString().split("T")[0]!,
      revenue: Math.floor(base * 100),
      succeeded,
      failed,
      total: succeeded + failed,
    });
  }

  return data;
}

export const mockChartData = generateChartData();

// --- Mock PSP configs ---

export const mockPspConfigs = [
  {
    provider: "stripe" as PspProvider,
    enabled: true,
    priority: 1,
    connected: true,
    lastPayment: "2 min ago",
  },
  {
    provider: "coinbase_commerce" as PspProvider,
    enabled: true,
    priority: 2,
    connected: true,
    lastPayment: "1 hour ago",
  },
];
