"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { mockPspConfigs } from "@/lib/mock-data";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"providers" | "api-keys" | "webhooks">("providers");

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
          {(["providers", "api-keys", "webhooks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "providers"
                ? "Payment Providers"
                : tab === "api-keys"
                  ? "API Keys"
                  : "Webhooks"}
            </button>
          ))}
        </div>

        {activeTab === "providers" && <ProvidersTab />}
        {activeTab === "api-keys" && <ApiKeysTab />}
        {activeTab === "webhooks" && <WebhooksTab />}
      </div>
    </>
  );
}

function ProvidersTab() {
  return (
    <div className="space-y-6">
      {mockPspConfigs.map((config) => (
        <div
          key={config.provider}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Provider icon */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  config.provider === "stripe"
                    ? "bg-purple-100"
                    : "bg-blue-100"
                }`}
              >
                <span
                  className={`text-lg font-bold ${
                    config.provider === "stripe"
                      ? "text-purple-600"
                      : "text-blue-600"
                  }`}
                >
                  {config.provider === "stripe" ? "S" : "C"}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {config.provider === "stripe"
                    ? "Stripe"
                    : "Coinbase Commerce"}
                </h3>
                <p className="text-sm text-gray-500">
                  {config.provider === "stripe"
                    ? "Card payments — Visa, Mastercard, Amex"
                    : "Crypto payments — USDT, USDC, BTC, ETH"}
                </p>
              </div>
            </div>

            {/* Status + toggle */}
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-sm">
                {config.connected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-green-700">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-gray-500">Not connected</span>
                  </>
                )}
              </span>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Priority</p>
              <p className="text-sm font-medium text-gray-900">
                #{config.priority}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last payment</p>
              <p className="text-sm font-medium text-gray-900">
                {config.lastPayment}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium text-gray-900">
                {config.enabled ? "Active" : "Disabled"}
              </p>
            </div>
          </div>
        </div>
      ))}
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
            {showKey ? mockApiKey : "qk_live_••••••••••••••••••••••••••••••••"}
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
          Keep your API key secret. Do not share it or include it in client-side code.
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Test API Key</h3>
        <p className="mt-1 text-sm text-gray-500">
          Use this key for development and testing. No real charges.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-600">
            qk_test_••••••••••••••••••••••••••••••••
          </div>
          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Reveal
          </button>
          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Copy
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <button className="text-sm font-medium text-brand-600 hover:text-brand-700">
          + Generate new API key
        </button>
      </div>
    </div>
  );
}

function WebhooksTab() {
  const webhookUrl = "https://api.example.com/v1/webhooks/qarta";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Webhook Endpoint</h3>
        <p className="mt-1 text-sm text-gray-500">
          Qarta will send POST requests to this URL when payment events occur.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Endpoint URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              defaultValue={webhookUrl}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="https://your-api.com/webhooks/qarta"
            />
            <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
              Save
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium text-gray-700">Events</h4>
          <div className="space-y-2">
            {[
              "payment.succeeded",
              "payment.failed",
              "payment.refunded",
              "chargeback.created",
              "chargeback.resolved",
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
                <span className="font-mono text-sm text-gray-700">{event}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900">Webhook Secret</h3>
        <p className="mt-1 text-sm text-gray-500">
          Use this secret to verify webhook signatures.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-600">
            whsec_••••••••••••••••••••••••
          </div>
          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Reveal
          </button>
          <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Roll secret
          </button>
        </div>
      </div>
    </div>
  );
}
