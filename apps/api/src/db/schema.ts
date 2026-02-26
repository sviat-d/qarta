import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["card", "crypto"]);

export const pspProviderEnum = pgEnum("psp_provider", [
  "stripe",
  "coinbase_commerce",
]);

export const declineTypeEnum = pgEnum("decline_type", ["hard", "soft"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "paused",
]);

export const chargebackStatusEnum = pgEnum("chargeback_status", [
  "open",
  "under_review",
  "won",
  "lost",
]);

// --- Tables ---

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  pspConfigs: jsonb("psp_configs").$type<
    {
      provider: string;
      enabled: boolean;
      priority: number;
      credentials: Record<string, string>;
    }[]
  >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    externalId: text("external_id"),
    amount: integer("amount").notNull(), // stored in cents
    currency: varchar("currency", { length: 3 }).notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    method: paymentMethodEnum("method").default("card").notNull(),
    provider: pspProviderEnum("provider"),
    customerId: text("customer_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_merchant_idx").on(table.merchantId),
    index("payments_status_idx").on(table.status),
    index("payments_customer_idx").on(table.customerId),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .references(() => payments.id)
      .notNull(),
    provider: pspProviderEnum("provider").notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    declineCode: text("decline_code"),
    declineType: declineTypeEnum("decline_type"),
    providerTransactionId: text("provider_transaction_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("attempts_payment_idx").on(table.paymentId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    customerId: text("customer_id").notNull(),
    planId: text("plan_id").notNull(),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("subs_merchant_idx").on(table.merchantId),
    index("subs_customer_idx").on(table.customerId),
  ],
);

export const chargebacks = pgTable(
  "chargebacks",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .references(() => payments.id)
      .notNull(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    reason: text("reason").notNull(),
    status: chargebackStatusEnum("status").default("open").notNull(),
    provider: pspProviderEnum("provider").notNull(),
    providerDisputeId: text("provider_dispute_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cb_payment_idx").on(table.paymentId),
    index("cb_merchant_idx").on(table.merchantId),
    index("cb_status_idx").on(table.status),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    provider: pspProviderEnum("provider").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wh_type_idx").on(table.type),
    index("wh_provider_idx").on(table.provider),
  ],
);
