import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ApiResponse } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";

const updateSchema = z.object({
  slackWebhookUrl: z.string().url().nullable().optional(),
  slackEnabled: z.boolean().optional(),
  emailAddress: z.string().email().nullable().optional(),
  emailEnabled: z.boolean().optional(),
  notifyNewAlert: z.boolean().optional(),
  notifyAutoRefund: z.boolean().optional(),
  notifyEscalated: z.boolean().optional(),
  notifyDailySummary: z.boolean().optional(),
});

export interface NotificationSettingsData {
  slackWebhookUrl: string | null;
  slackEnabled: boolean;
  emailAddress: string | null;
  emailEnabled: boolean;
  notifyNewAlert: boolean;
  notifyAutoRefund: boolean;
  notifyEscalated: boolean;
  notifyDailySummary: boolean;
}

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticateApiKey);

  // Get notification settings
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.merchantId, merchant.id),
    });

    const data: NotificationSettingsData = settings
      ? {
          slackWebhookUrl: settings.slackWebhookUrl,
          slackEnabled: settings.slackEnabled,
          emailAddress: settings.emailAddress,
          emailEnabled: settings.emailEnabled,
          notifyNewAlert: settings.notifyNewAlert,
          notifyAutoRefund: settings.notifyAutoRefund,
          notifyEscalated: settings.notifyEscalated,
          notifyDailySummary: settings.notifyDailySummary,
        }
      : {
          slackWebhookUrl: null,
          slackEnabled: false,
          emailAddress: null,
          emailEnabled: false,
          notifyNewAlert: true,
          notifyAutoRefund: true,
          notifyEscalated: true,
          notifyDailySummary: true,
        };

    const response: ApiResponse<NotificationSettingsData> = {
      success: true,
      data,
    };

    return reply.send(response);
  });

  // Update notification settings
  app.put<{ Body: z.infer<typeof updateSchema> }>("/", async (request, reply) => {
    const merchant = request.merchant!;
    const parsed = updateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid notification settings",
          details: parsed.error.format(),
        },
      });
    }

    const data = parsed.data;

    const existing = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.merchantId, merchant.id),
    });

    if (existing) {
      await db
        .update(schema.notificationSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.notificationSettings.merchantId, merchant.id));
    } else {
      await db.insert(schema.notificationSettings).values({
        id: `ns_${nanoid()}`,
        merchantId: merchant.id,
        slackWebhookUrl: data.slackWebhookUrl ?? null,
        slackEnabled: data.slackEnabled ?? false,
        emailAddress: data.emailAddress ?? null,
        emailEnabled: data.emailEnabled ?? false,
        notifyNewAlert: data.notifyNewAlert ?? true,
        notifyAutoRefund: data.notifyAutoRefund ?? true,
        notifyEscalated: data.notifyEscalated ?? true,
        notifyDailySummary: data.notifyDailySummary ?? true,
      });
    }

    // Audit log
    await db.insert(schema.auditLog).values({
      id: `aud_${nanoid()}`,
      merchantId: merchant.id,
      actor: "user",
      event: "notification_settings_updated",
      details: data as Record<string, unknown>,
    });

    return reply.send({ success: true, data: { updated: true } });
  });

  // Test Slack webhook
  app.post("/test-slack", async (request, reply) => {
    const merchant = request.merchant!;

    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.merchantId, merchant.id),
    });

    if (!settings?.slackWebhookUrl) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_WEBHOOK", message: "No Slack webhook URL configured" },
      });
    }

    try {
      const response = await fetch(settings.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "✅ Qarta test notification — your Slack integration is working!",
        }),
      });

      if (!response.ok) {
        return reply.status(400).send({
          success: false,
          error: { code: "WEBHOOK_FAILED", message: `Slack returned ${response.status}` },
        });
      }

      return reply.send({ success: true, data: { sent: true } });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        error: { code: "WEBHOOK_ERROR", message: "Failed to reach Slack webhook URL" },
      });
    }
  });
}
