CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"slack_webhook_url" text,
	"slack_enabled" boolean DEFAULT false NOT NULL,
	"email_address" text,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"notify_new_alert" boolean DEFAULT true NOT NULL,
	"notify_auto_refund" boolean DEFAULT true NOT NULL,
	"notify_escalated" boolean DEFAULT true NOT NULL,
	"notify_daily_summary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notif_merchant_idx" ON "notification_settings" USING btree ("merchant_id");
