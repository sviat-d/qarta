import { eq, and, gte, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

interface DailySummaryData {
  merchantName: string;
  alertsTotal: number;
  alertsAutoResolved: number;
  alertsEscalated: number;
  alertsDismissed: number;
  totalRefunded: number;
  feesAvoided: number;
}

const DISPUTE_FEE_CENTS = 1500;

/**
 * Gather and send daily summary emails to all merchants who have it enabled.
 */
export async function sendDailySummaries(): Promise<void> {
  console.log("Starting daily summary email job...");

  const settings = await db.query.notificationSettings.findMany({
    where: and(
      eq(schema.notificationSettings.emailEnabled, true),
      eq(schema.notificationSettings.notifyDailySummary, true),
    ),
  });

  if (settings.length === 0) {
    console.log("No merchants with daily summary enabled");
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const setting of settings) {
    if (!setting.emailAddress) continue;

    try {
      const merchant = await db.query.merchants.findFirst({
        where: eq(schema.merchants.id, setting.merchantId),
      });
      if (!merchant) continue;

      // Get yesterday's alert stats
      const alertStats = await db
        .select({
          status: schema.alerts.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.alerts)
        .where(
          and(
            eq(schema.alerts.merchantId, setting.merchantId),
            gte(schema.alerts.createdAt, yesterday),
          ),
        )
        .groupBy(schema.alerts.status);

      const statusCounts: Record<string, number> = {};
      for (const row of alertStats) {
        statusCounts[row.status] = row.count;
      }

      const alertsTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      const alertsAutoResolved = statusCounts["auto_refunded"] ?? 0;
      const alertsEscalated = statusCounts["escalated"] ?? 0;
      const alertsDismissed = statusCounts["dismissed"] ?? 0;

      // Get yesterday's refund total
      const [refundStats] = await db
        .select({
          total: sql<number>`coalesce(sum(${schema.refundActions.refundAmount}), 0)::int`,
        })
        .from(schema.refundActions)
        .where(
          and(
            eq(schema.refundActions.merchantId, setting.merchantId),
            eq(schema.refundActions.status, "executed"),
            gte(schema.refundActions.createdAt, yesterday),
          ),
        );

      const summary: DailySummaryData = {
        merchantName: merchant.name,
        alertsTotal,
        alertsAutoResolved,
        alertsEscalated,
        alertsDismissed,
        totalRefunded: refundStats?.total ?? 0,
        feesAvoided: alertsAutoResolved * DISPUTE_FEE_CENTS,
      };

      await sendSummaryEmail(setting.emailAddress, summary);
      console.log(`Daily summary sent to ${setting.emailAddress}`);
    } catch (err) {
      console.error(`Failed to send daily summary to ${setting.merchantId}:`, err);
    }
  }

  console.log("Daily summary job completed");
}

async function sendSummaryEmail(to: string, data: DailySummaryData): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const provider = process.env.EMAIL_PROVIDER ?? "resend";
  const fromAddress = process.env.EMAIL_FROM ?? "alerts@qarta.eu";

  if (!apiKey) {
    console.warn("EMAIL_API_KEY not set, skipping daily summary");
    return;
  }

  const refundedFormatted = `$${(data.totalRefunded / 100).toFixed(2)}`;
  const feesFormatted = `$${(data.feesAvoided / 100).toFixed(2)}`;

  const subject = `[Qarta] Daily Summary — ${data.alertsTotal} alerts, ${data.alertsAutoResolved} auto-resolved`;
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:#1e293b;padding:16px 24px;">
        <h2 style="margin:0;color:#fff;font-size:18px;">Daily Summary</h2>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#374151;">Hi ${data.merchantName}, here's your chargeback protection summary for yesterday:</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#6b7280;">Total Alerts</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;">${data.alertsTotal}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#6b7280;">Auto-Resolved</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;color:#10b981;">${data.alertsAutoResolved}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#6b7280;">Escalated</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;color:#f59e0b;">${data.alertsEscalated}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#6b7280;">Dismissed</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;">${data.alertsDismissed}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;color:#6b7280;">Total Refunded</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;">${refundedFormatted}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#6b7280;">Dispute Fees Avoided</td>
            <td style="padding:8px 12px;font-weight:600;text-align:right;color:#10b981;">${feesFormatted}</td>
          </tr>
        </table>

        ${data.alertsTotal === 0 ? '<p style="margin:0;color:#6b7280;font-size:13px;">No alerts yesterday — your dispute rate stays protected.</p>' : ""}
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Qarta Chargeback Deflection</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

  const url = provider === "sendgrid"
    ? "https://api.sendgrid.com/v3/mail/send"
    : "https://api.resend.com/emails";

  const body = provider === "sendgrid"
    ? JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromAddress },
        subject,
        content: [{ type: "text/html", value: html }],
      })
    : JSON.stringify({ from: fromAddress, to: [to], subject, html });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Daily summary email failed: ${response.status} ${text}`);
  }
}
