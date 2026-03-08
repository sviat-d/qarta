import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

interface EmailNotificationEvent {
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
 * Send email notification for an alert event.
 * Uses a simple SMTP-style approach via fetch to a transactional email API.
 *
 * Supported providers (via SMTP_PROVIDER env):
 * - resend (default): Resend.com API
 * - sendgrid: SendGrid API
 * - smtp: Generic SMTP (not implemented in v1)
 *
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function sendEmailNotification(
  event: EmailNotificationEvent,
): Promise<void> {
  try {
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.merchantId, event.merchantId),
    });

    if (!settings?.emailEnabled || !settings.emailAddress) return;

    const shouldNotify =
      (event.type === "new_alert" && settings.notifyNewAlert) ||
      (event.type === "auto_refund" && settings.notifyAutoRefund) ||
      (event.type === "escalated" && settings.notifyEscalated);

    if (!shouldNotify) return;

    const { subject, html } = buildEmailContent(event);

    const apiKey = config.EMAIL_API_KEY;
    const provider = config.EMAIL_PROVIDER;
    const fromAddress = config.EMAIL_FROM;

    if (!apiKey) {
      console.warn("EMAIL_API_KEY not set, skipping email notification");
      return;
    }

    switch (provider) {
      case "resend":
        await sendViaResend(apiKey, fromAddress, settings.emailAddress, subject, html);
        break;
      case "sendgrid":
        await sendViaSendGrid(apiKey, fromAddress, settings.emailAddress, subject, html);
        break;
      default:
        console.warn(`Unknown email provider: ${provider}`);
    }
  } catch (err) {
    console.error("Email notification error:", err);
  }
}

function buildEmailContent(event: EmailNotificationEvent): {
  subject: string;
  html: string;
} {
  const amount = `$${(event.amount / 100).toFixed(2)} ${event.currency.toUpperCase()}`;
  const source = event.source.replace(/_/g, " ").replace("stripe ", "");
  const reason = event.reasonCategory.replace(/_/g, " ");

  let subject: string;
  let statusColor: string;
  let statusLabel: string;

  switch (event.type) {
    case "new_alert":
      subject = `New Alert: ${amount} — ${reason}`;
      statusColor = "#f59e0b";
      statusLabel = "New Alert Received";
      break;
    case "auto_refund":
      subject = `Auto-Refund Executed: ${amount}`;
      statusColor = "#10b981";
      statusLabel = "Auto-Refund Executed";
      break;
    case "escalated":
      subject = `Alert Escalated: ${amount} — requires review`;
      statusColor = "#ef4444";
      statusLabel = "Alert Escalated for Review";
      break;
  }

  const customerRow = event.customerEmail
    ? `<tr><td style="padding:4px 12px;color:#6b7280;">Customer</td><td style="padding:4px 12px;font-weight:500;">${event.customerEmail}</td></tr>`
    : "";

  const policyRow = event.policyName
    ? `<tr><td style="padding:4px 12px;color:#6b7280;">Policy</td><td style="padding:4px 12px;font-weight:500;">${event.policyName}</td></tr>`
    : "";

  const refundRow = event.refundId
    ? `<tr><td style="padding:4px 12px;color:#6b7280;">Refund ID</td><td style="padding:4px 12px;font-weight:500;font-family:monospace;">${event.refundId}</td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:${statusColor};padding:16px 24px;">
        <h2 style="margin:0;color:#fff;font-size:18px;">${statusLabel}</h2>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#374151;">Alert <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${event.alertId}</code></p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 12px;color:#6b7280;">Amount</td><td style="padding:4px 12px;font-weight:600;">${amount}</td></tr>
          <tr><td style="padding:4px 12px;color:#6b7280;">Source</td><td style="padding:4px 12px;">${source}</td></tr>
          <tr><td style="padding:4px 12px;color:#6b7280;">Reason</td><td style="padding:4px 12px;">${reason}</td></tr>
          ${customerRow}
          ${policyRow}
          ${refundRow}
        </table>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Qarta Chargeback Deflection</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

  return { subject: `[Qarta] ${subject}`, html };
}

/**
 * Send a password reset email with a one-time link.
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  try {
    const apiKey = config.EMAIL_API_KEY;
    const provider = config.EMAIL_PROVIDER;
    const fromAddress = config.EMAIL_FROM;

    if (!apiKey) {
      console.error("[email] EMAIL_API_KEY not set — cannot send password reset email!");
      return;
    }

    console.log(`[email] Preparing password reset email: provider=${provider} from=${fromAddress} to=${to}`);

    const subject = "[Qarta] Reset your password";
    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:#6366f1;padding:16px 24px;">
        <h2 style="margin:0;color:#fff;font-size:18px;">Reset Your Password</h2>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#374151;">You requested a password reset for your Qarta account. Click the button below to set a new password.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Reset Password</a>
        </div>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="margin:0;color:#9ca3af;font-size:12px;word-break:break-all;">${resetUrl}</p>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Qarta Chargeback Deflection</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

    switch (provider) {
      case "resend":
        await sendViaResend(apiKey, fromAddress, to, subject, html);
        break;
      case "sendgrid":
        await sendViaSendGrid(apiKey, fromAddress, to, subject, html);
        break;
      default:
        console.warn(`Unknown email provider: ${provider}`);
    }
  } catch (err) {
    console.error("Password reset email error:", err);
  }
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const payload = { from, to: [to], subject, html };
  console.log(`[email] Sending via Resend to=${to} from=${from}`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`[email] Resend failed: ${response.status} ${body}`);
  } else {
    console.log(`[email] Resend success: ${body}`);
  }
}

async function sendViaSendGrid(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`SendGrid email failed: ${response.status} ${body}`);
  }
}
