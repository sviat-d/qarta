import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Stripe — the only PSP
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(), // for Connect account events
  STRIPE_CLIENT_ID: z.string().optional(), // for OAuth Connect

  API_KEY_SALT: z.string().default("dev-salt-change-in-production"),

  // Email notifications
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid"]).default("resend"),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("alerts@qarta.eu"),

  // Comma-separated list of allowed CORS origins
  CORS_ORIGINS: z.string().default("https://qarta.eu"),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
