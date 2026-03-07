ALTER TABLE "merchants" ADD COLUMN "password_hash" text;
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_email_unique" UNIQUE("email");
CREATE INDEX IF NOT EXISTS "merchants_email_idx" ON "merchants" ("email");
