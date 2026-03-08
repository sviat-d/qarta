DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'canceled', 'trialing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "merchant_id" text NOT NULL REFERENCES "merchants"("id") UNIQUE,
  "plan" text NOT NULL DEFAULT 'free',
  "status" "subscription_status" NOT NULL DEFAULT 'active',
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "stripe_price_id" text,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sub_merchant_idx" ON "subscriptions" ("merchant_id");
CREATE INDEX IF NOT EXISTS "sub_stripe_customer_idx" ON "subscriptions" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "sub_stripe_sub_idx" ON "subscriptions" ("stripe_subscription_id");
