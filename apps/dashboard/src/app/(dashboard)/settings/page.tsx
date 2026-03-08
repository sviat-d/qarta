"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import {
  fetchStripeStatus,
  initiateStripeConnect,
  fetchNotificationSettings,
  updateNotificationSettings,
  testSlackWebhook,
  fetchBilling,
  createCheckout,
  createBillingPortal,
  type NotificationSettings,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "stripe" | "billing" | "notifications" | "api-keys"
  >("stripe");

  const tabs = [
    { id: "stripe" as const, label: "Stripe Connection" },
    { id: "billing" as const, label: "Billing" },
    { id: "notifications" as const, label: "Notifications" },
    { id: "api-keys" as const, label: "API Keys" },
  ];

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-8">
        <div className="mb-8 flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "stripe" && <StripeTab />}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "api-keys" && <ApiKeysTab />}
      </div>
    </>
  );
}

function StripeTab() {
  const { data, isLoading } = useApi(() => fetchStripeStatus(), []);
  const [connecting, setConnecting] = useState(false);

  const connection = data?.data;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await initiateStripeConnect();
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <span className="text-lg font-bold text-purple-600">S</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Stripe</h3>
              <p className="text-sm text-gray-500">
                {connection?.connected
                  ? "Connected via OAuth — receiving webhooks for EFW and disputes"
                  : "Connect your Stripe account to start deflecting chargebacks"}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : connection?.connected ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-700">Connected</span>
            </span>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {connecting ? "Redirecting..." : "Connect Stripe"}
            </button>
          )}
        </div>

        {connection?.connected && (
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Account</p>
              <p className="text-sm font-medium text-gray-900">
                {connection.stripeAccountId}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mode</p>
              <p className="text-sm font-medium text-gray-900">
                {connection.livemode ? "Live" : "Test"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Connected</p>
              <p className="text-sm font-medium text-gray-900">
                {connection.connectedAt
                  ? new Date(connection.connectedAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Webhook Events</h3>
        <p className="mt-1 text-sm text-gray-500">
          Events Qarta listens to from your Stripe account.
        </p>
        <div className="mt-4 space-y-2">
          {[
            "radar.early_fraud_warning.created",
            "charge.dispute.created",
            "charge.dispute.updated",
            "charge.dispute.closed",
            "charge.refunded",
          ].map((event) => (
            <div
              key={event}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-2.5"
            >
              <span className={`h-2 w-2 rounded-full ${connection?.connected ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="font-mono text-sm text-gray-700">{event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { data, isLoading, refetch } = useApi(() => fetchNotificationSettings(), []);
  const [slackUrl, setSlackUrl] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [initialized, setInitialized] = useState(false);

  const settings = data?.data;

  // Sync local state from API on first load
  if (settings && !initialized) {
    setSlackUrl(settings.slackWebhookUrl ?? "");
    setEmailAddr(settings.emailAddress ?? "");
    setInitialized(true);
  }

  const saveSlack = async () => {
    setSaving("slack");
    try {
      await updateNotificationSettings({
        slackWebhookUrl: slackUrl || null,
        slackEnabled: !!slackUrl,
      });
      refetch();
    } finally {
      setSaving(null);
    }
  };

  const saveEmail = async () => {
    setSaving("email");
    try {
      await updateNotificationSettings({
        emailAddress: emailAddr || null,
        emailEnabled: !!emailAddr,
      });
      refetch();
    } finally {
      setSaving(null);
    }
  };

  const toggleEvent = async (field: keyof NotificationSettings, value: boolean) => {
    await updateNotificationSettings({ [field]: value });
    refetch();
  };

  const handleTestSlack = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testSlackWebhook();
      setTestResult("success");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const events = [
    { key: "notifyNewAlert" as const, label: "New alert received" },
    { key: "notifyAutoRefund" as const, label: "Auto-refund executed" },
    { key: "notifyEscalated" as const, label: "Alert escalated to manual review" },
    { key: "notifyDailySummary" as const, label: "Daily summary report" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Slack Notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get notified in Slack when alerts are received or actions are taken.
            </p>
          </div>
          {settings?.slackEnabled && (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-700">Active</span>
            </span>
          )}
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Webhook URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="https://hooks.slack.com/services/..."
            />
            <button
              onClick={saveSlack}
              disabled={saving === "slack"}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving === "slack" ? "Saving..." : "Save"}
            </button>
          </div>
          {settings?.slackEnabled && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleTestSlack}
                disabled={testing}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {testing ? "Sending..." : "Send test message"}
              </button>
              {testResult === "success" && (
                <span className="text-sm text-green-600">Sent!</span>
              )}
              {testResult === "error" && (
                <span className="text-sm text-red-600">Failed — check your webhook URL</span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Notify on
          </h4>
          <div className="space-y-2">
            {events.map((event) => (
              <label
                key={event.key}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-2.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={settings?.[event.key] ?? true}
                  onChange={(e) => toggleEvent(event.key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">{event.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Email Notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              Receive email alerts for critical events.
            </p>
          </div>
          {settings?.emailEnabled && (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-700">Active</span>
            </span>
          )}
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={emailAddr}
              onChange={(e) => setEmailAddr(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@company.com"
            />
            <button
              onClick={saveEmail}
              disabled={saving === "email"}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving === "email" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const { isDemo } = useAuth();
  const { data, isLoading } = useApi(() => fetchBilling(), []);
  const [loading, setLoading] = useState<string | null>(null);

  const billing = data?.data;
  const planName = billing?.planDetails?.name ?? "Free";
  const priceFormatted = billing?.planDetails?.priceMonthly
    ? `$${(billing.planDetails.priceMonthly / 100).toFixed(0)}/mo`
    : "Free";

  const handleUpgrade = async (plan: "pro" | "growth") => {
    if (isDemo) return;
    setLoading(plan);
    try {
      const result = await createCheckout(plan);
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    if (isDemo) return;
    setLoading("portal");
    try {
      const result = await createBillingPortal();
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Current Plan</h3>
            <p className="mt-1 text-sm text-gray-500">
              You are on the <span className="font-semibold text-gray-900">{planName}</span> plan ({priceFormatted})
            </p>
            {billing?.cancelAtPeriodEnd && (
              <p className="mt-1 text-sm text-amber-600">
                Cancels at end of period ({billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : ""})
              </p>
            )}
          </div>
          {billing?.stripeSubscriptionId && (
            <button
              onClick={handleManage}
              disabled={loading === "portal" || isDemo}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading === "portal" ? "Loading..." : "Manage Subscription"}
            </button>
          )}
        </div>
      </div>

      {/* Upgrade options */}
      {billing?.plan === "free" && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { plan: "pro" as const, name: "Pro", price: "$199/mo", desc: "Unlimited alerts + $15/deflection", features: ["Unlimited alerts", "Advanced policy engine", "Slack + email notifications", "Priority support"] },
            { plan: "growth" as const, name: "Growth", price: "$399/mo", desc: "Volume discounts + $10/deflection", features: ["Everything in Pro", "Volume discounts", "Custom policy rules", "API access", "Dedicated support"] },
          ].map((tier) => (
            <div key={tier.plan} className="rounded-xl border border-gray-200 bg-white p-6">
              <h4 className="text-lg font-semibold text-gray-900">{tier.name}</h4>
              <p className="mt-1 text-2xl font-bold text-gray-900">{tier.price}</p>
              <p className="mt-1 text-sm text-gray-500">{tier.desc}</p>
              <ul className="mt-4 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(tier.plan)}
                disabled={loading === tier.plan || isDemo}
                className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading === tier.plan ? "Loading..." : `Upgrade to ${tier.name}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {isDemo && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Billing is disabled in demo mode. Sign up to manage your subscription.
        </div>
      )}
    </div>
  );
}

function ApiKeysTab() {
  const { logout } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">API Key</h3>
        <p className="mt-1 text-sm text-gray-500">
          You are currently authenticated with an API key. Your key is stored
          locally and never sent to Qarta servers.
        </p>

        <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Keep your API key secret. Do not share it or include it in
          client-side code.
        </div>

        <div className="mt-4">
          <button
            onClick={() => logout()}
            className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
