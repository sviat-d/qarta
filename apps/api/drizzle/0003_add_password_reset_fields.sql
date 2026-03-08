ALTER TABLE "merchants" ADD COLUMN "password_reset_token" text;
ALTER TABLE "merchants" ADD COLUMN "password_reset_expires_at" timestamp;
