"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "stripe" | "notifications" | "api-keys"
  >("stripe");

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-8">
        {/* Tabs */}
        <div className="mb-8 flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(["stripe", "notifications", "api-keys"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "stripe"
                ? "Stripe Connection"
                : tab === "notifications"
                  ? "Notifications"
                  : "API Keys"}
            </button>
          ))}
        </div>

        {activeTab === "stripe" && <StripeTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "api-keys" && <ApiKeysTab />}
      </div>
    </>
  );
}

function StripeTab() {
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
                Connected via OAuth — receiving webhooks for EFW and disputes
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-green-700">Connected</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-500">Account</p>
            <p className="text-sm font-medium text-gray-900">
              acct_1234567890
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Mode</p>
            <p className="text-sm font-medium text-gray-900">Live</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Last webhook</p>
            <p className="text-sm font-medium text-gray-900">2 min ago</p>
          </div>
        </div>
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
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-mono text-sm text-gray-700">{event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Slack Notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get notified in Slack when alerts are received or actions are taken.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Webhook URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="https://hooks.slack.com/services/..."
            />
            <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
              Save
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Notify on
          </h4>
          <div className="space-y-2">
            {[
              "New alert received",
              "Auto-refund executed",
              "Alert escalated to manual review",
              "Daily summary report",
            ].map((event) => (
              <label
                key={event}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-2.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">{event}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Email Notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Receive email alerts for critical events.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              defaultValue="acme@company.com"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [showKey, setShowKey] = useState(false);
  const mockApiKey = "qk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Live API Key</h3>
        <p className="mt-1 text-sm text-gray-500">
          Use this key to authenticate API requests from your server.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-900">
            {showKey
              ? mockApiKey
              : "qk_live_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {showKey ? "Hide" : "Reveal"}
          </button>
          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Copy
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Keep your API key secret. Do not share it or include it in
          client-side code.
        </div>
      </div>
    </div>
  );
}
