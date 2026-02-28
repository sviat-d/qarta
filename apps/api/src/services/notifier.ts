import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

interface NotificationEvent {
  type: "new_alert" | "auto_refund" | "escalated";
  merchantId: string;
  alertId: string;
  amount: number;
  currency: string;
  source: string;
  reasonCategory: string;
  customerEmail?: string;
  policyName?: string;
  refundId?: string;
}

/**
 * Send notifications for an alert event (Slack webhook).
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function sendNotification(event: NotificationEvent): Promise<void> {
  try {
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.merchantId, event.merchantId),
    });

    if (!settings) return;

    // Check if this event type should trigger a notification
    const shouldNotify =
      (event.type === "new_alert" && settings.notifyNewAlert) ||
      (event.type === "auto_refund" && settings.notifyAutoRefund) ||
      (event.type === "escalated" && settings.notifyEscalated);

    if (!shouldNotify) return;

    // Send Slack notification
    if (settings.slackEnabled && settings.slackWebhookUrl) {
      await sendSlackNotification(settings.slackWebhookUrl, event);
    }
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error("Notification error:", err);
  }
}

async function sendSlackNotification(
  webhookUrl: string,
  event: NotificationEvent,
): Promise<void> {
  const amount = `$${(event.amount / 100).toFixed(2)} ${event.currency.toUpperCase()}`;
  const source = event.source.replace(/_/g, " ").replace("stripe ", "");
  const reason = event.reasonCategory.replace(/_/g, " ");

  let emoji: string;
  let title: string;
  let color: string;

  switch (event.type) {
    case "new_alert":
      emoji = "🚨";
      title = "New Alert Received";
      color = "#f59e0b";
      break;
    case "auto_refund":
      emoji = "✅";
      title = "Auto-Refund Executed";
      color = "#10b981";
      break;
    case "escalated":
      emoji = "⚠️";
      title = "Alert Escalated";
      color = "#ef4444";
      break;
  }

  const fields = [
    { title: "Amount", value: amount, short: true },
    { title: "Source", value: source, short: true },
    { title: "Reason", value: reason, short: true },
  ];

  if (event.customerEmail) {
    fields.push({ title: "Customer", value: event.customerEmail, short: true });
  }

  if (event.policyName) {
    fields.push({ title: "Policy", value: event.policyName, short: true });
  }

  if (event.refundId) {
    fields.push({ title: "Refund ID", value: event.refundId, short: true });
  }

  const payload = {
    text: `${emoji} ${title}`,
    attachments: [
      {
        color,
        title: `${emoji} ${title}`,
        text: `Alert \`${event.alertId}\` — ${amount} (${reason})`,
        fields,
        footer: "Qarta Chargeback Deflection",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}
