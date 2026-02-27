import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { alertRoutes } from "./routes/payments.js";
import { policyRoutes } from "./routes/policies.js";
import { outcomesRoutes } from "./routes/outcomes.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { connectRoutes } from "./routes/connect.js";
import { authRoutes } from "./routes/auth.js";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Plugins
  await app.register(cors, {
    origin:
      config.NODE_ENV === "production"
        ? [config.DASHBOARD_URL, "https://qarta.eu"]
        : true,
    credentials: true,
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Routes
  await app.register(healthRoutes, { prefix: "/" });
  await app.register(alertRoutes, { prefix: "/v1/alerts" });
  await app.register(policyRoutes, { prefix: "/v1/policies" });
  await app.register(outcomesRoutes, { prefix: "/v1/outcomes" });
  await app.register(webhookRoutes, { prefix: "/v1/webhooks" });
  await app.register(connectRoutes, { prefix: "/v1/connect" });
  await app.register(authRoutes, { prefix: "/v1/auth" });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Qarta API running on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
