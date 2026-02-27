CREATE TYPE "public"."alert_source" AS ENUM('stripe_efw', 'stripe_dispute', 'stripe_inquiry', 'manual');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('new', 'evaluating', 'auto_refunded', 'escalated', 'manually_resolved', 'dismissed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."audit_actor" AS ENUM('system', 'user');--> statement-breakpoint
CREATE TYPE "public"."dispute_reason_category" AS ENUM('fraudulent', 'unrecognized', 'duplicate', 'product_not_received', 'product_unacceptable', 'subscription_canceled', 'general');--> statement-breakpoint
CREATE TYPE "public"."policy_action_type" AS ENUM('auto_refund', 'escalate', 'dismiss');--> statement-breakpoint
CREATE TYPE "public"."refund_action_status" AS ENUM('pending', 'executed', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"source" "alert_source" NOT NULL,
	"status" "alert_status" DEFAULT 'new' NOT NULL,
	"stripe_charge_id" text,
	"stripe_payment_intent_id" text,
	"stripe_dispute_id" text,
	"stripe_efw_id" text,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"reason_category" "dispute_reason_category" DEFAULT 'general' NOT NULL,
	"reason_raw" text,
	"customer_email" text,
	"customer_id" text,
	"card_last4" varchar(4),
	"card_brand" text,
	"is_actionable" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"alert_id" text,
	"action_id" text,
	"actor" "audit_actor" NOT NULL,
	"event" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"stripe_account_id" text,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"conditions" jsonb NOT NULL,
	"action_type" "policy_action_type" NOT NULL,
	"cancel_subscription" boolean DEFAULT false NOT NULL,
	"max_refunds_per_day" integer DEFAULT 25 NOT NULL,
	"max_refunds_per_customer" integer DEFAULT 3 NOT NULL,
	"max_refund_amount" integer DEFAULT 50000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refund_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"policy_id" text,
	"status" "refund_action_status" DEFAULT 'pending' NOT NULL,
	"refund_amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"stripe_refund_id" text,
	"stripe_charge_id" text NOT NULL,
	"canceled_subscription" boolean DEFAULT false NOT NULL,
	"failure_reason" text,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"scope" text NOT NULL,
	"livemode" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_action_id_refund_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."refund_actions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_actions" ADD CONSTRAINT "refund_actions_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_actions" ADD CONSTRAINT "refund_actions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_actions" ADD CONSTRAINT "refund_actions_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_merchant_idx" ON "alerts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_source_idx" ON "alerts" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_stripe_charge_idx" ON "alerts" USING btree ("stripe_charge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_customer_idx" ON "alerts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_merchant_idx" ON "audit_log" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_alert_idx" ON "audit_log" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policies_merchant_idx" ON "policies" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policies_priority_idx" ON "policies" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_alert_idx" ON "refund_actions" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_merchant_idx" ON "refund_actions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_status_idx" ON "refund_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actions_created_idx" ON "refund_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stripe_conn_merchant_idx" ON "stripe_connections" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wh_stripe_event_idx" ON "webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wh_type_idx" ON "webhook_events" USING btree ("type");