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

export const alertSourceEnum = pgEnum("alert_source", [
  "stripe_efw",
  "stripe_dispute",
  "stripe_inquiry",
  "manual",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "new",
  "evaluating",
  "auto_refunded",
  "escalated",
  "manually_resolved",
  "dismissed",
  "expired",
]);

export const disputeReasonEnum = pgEnum("dispute_reason_category", [
  "fraudulent",
  "unrecognized",
  "duplicate",
  "product_not_received",
  "product_unacceptable",
  "subscription_canceled",
  "general",
]);

export const refundActionStatusEnum = pgEnum("refund_action_status", [
  "pending",
  "executed",
  "failed",
  "skipped",
]);

export const policyActionTypeEnum = pgEnum("policy_action_type", [
  "auto_refund",
  "escalate",
  "dismiss",
]);

export const auditActorEnum = pgEnum("audit_actor", ["system", "user"]);

// --- Tables ---

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  stripeAccountId: text("stripe_account_id"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stripeConnections = pgTable(
  "stripe_connections",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    stripeAccountId: text("stripe_account_id").notNull(),
    accessToken: text("access_token"), // only for OAuth flow (deprecated)
    refreshToken: text("refresh_token"),
    scope: text("scope").default("read_write").notNull(),
    livemode: boolean("livemode").default(false).notNull(),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
  },
  (table) => [index("stripe_conn_merchant_idx").on(table.merchantId)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    source: alertSourceEnum("source").notNull(),
    status: alertStatusEnum("status").default("new").notNull(),

    // Stripe identifiers for matching
    stripeChargeId: text("stripe_charge_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeDisputeId: text("stripe_dispute_id"),
    stripeEfwId: text("stripe_efw_id"),

    // Transaction details
    amount: integer("amount").notNull(), // cents
    currency: varchar("currency", { length: 3 }).notNull(),
    reasonCategory: disputeReasonEnum("reason_category")
      .default("general")
      .notNull(),
    reasonRaw: text("reason_raw"),

    // Customer info
    customerEmail: text("customer_email"),
    customerId: text("customer_id"),
    cardLast4: varchar("card_last4", { length: 4 }),
    cardBrand: text("card_brand"),

    // EFW specific
    isActionable: boolean("is_actionable").default(false).notNull(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("alerts_merchant_idx").on(table.merchantId),
    index("alerts_status_idx").on(table.status),
    index("alerts_source_idx").on(table.source),
    index("alerts_stripe_charge_idx").on(table.stripeChargeId),
    index("alerts_customer_idx").on(table.customerId),
    index("alerts_created_idx").on(table.createdAt),
  ],
);

export const policies = pgTable(
  "policies",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    name: text("name").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    priority: integer("priority").default(100).notNull(), // lower = first
    conditions: jsonb("conditions")
      .$type<
        {
          field: string;
          operator: string;
          value: string | number | string[];
        }[]
      >()
      .notNull(),
    actionType: policyActionTypeEnum("action_type").notNull(),
    cancelSubscription: boolean("cancel_subscription")
      .default(false)
      .notNull(),

    // Safety rails
    maxRefundsPerDay: integer("max_refunds_per_day").default(25).notNull(),
    maxRefundsPerCustomer: integer("max_refunds_per_customer")
      .default(3)
      .notNull(),
    maxRefundAmount: integer("max_refund_amount").default(50000).notNull(), // cents

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("policies_merchant_idx").on(table.merchantId),
    index("policies_priority_idx").on(table.priority),
  ],
);

export const refundActions = pgTable(
  "refund_actions",
  {
    id: text("id").primaryKey(),
    alertId: text("alert_id")
      .references(() => alerts.id)
      .notNull(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    policyId: text("policy_id").references(() => policies.id),
    status: refundActionStatusEnum("status").default("pending").notNull(),
    refundAmount: integer("refund_amount").notNull(), // cents
    currency: varchar("currency", { length: 3 }).notNull(),
    stripeRefundId: text("stripe_refund_id"),
    stripeChargeId: text("stripe_charge_id").notNull(),
    canceledSubscription: boolean("canceled_subscription")
      .default(false)
      .notNull(),
    failureReason: text("failure_reason"),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("actions_alert_idx").on(table.alertId),
    index("actions_merchant_idx").on(table.merchantId),
    index("actions_status_idx").on(table.status),
    index("actions_created_idx").on(table.createdAt),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id")
      .references(() => merchants.id)
      .notNull(),
    alertId: text("alert_id").references(() => alerts.id),
    actionId: text("action_id").references(() => refundActions.id),
    actor: auditActorEnum("actor").notNull(),
    event: text("event").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_merchant_idx").on(table.merchantId),
    index("audit_alert_idx").on(table.alertId),
    index("audit_created_idx").on(table.createdAt),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    stripeEventId: text("stripe_event_id").notNull().unique(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wh_stripe_event_idx").on(table.stripeEventId),
    index("wh_type_idx").on(table.type),
  ],
);
