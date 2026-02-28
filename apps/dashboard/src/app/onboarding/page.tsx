"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createPolicy } from "@/lib/api";
import { isDemoMode } from "@/lib/demo-data";

/* ─── Types ─── */

interface Product {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  pricing: string;
  icon: React.ReactNode;
}

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  category: "payment" | "enrichment";
  required?: boolean;
}

/* ─── Data ─── */

const PRODUCTS: Product[] = [
  {
    id: "deflection",
    name: "Chargeback Deflection",
    badge: "Most Popular",
    badgeColor: "bg-brand-100 text-brand-700",
    description:
      "Automatically refund pre-dispute alerts before they become chargebacks. Save on fees and protect your Stripe dispute ratio.",
    pricing: "Included in all plans",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    id: "alerts",
    name: "Pre-Dispute Alerts",
    badge: "Essential",
    badgeColor: "bg-emerald-100 text-emerald-700",
    description:
      "Real-time ingestion of Stripe Early Fraud Warnings and dispute events. Get notified before chargebacks hit your account.",
    pricing: "Included in all plans",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: "analytics",
    name: "Dispute Analytics",
    description:
      "Outcomes-driven dashboard with dispute ratio trends, fees saved, automation rate, and CFO-credible reporting.",
    pricing: "Included in Pro & Growth",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: "notifications",
    name: "Smart Notifications",
    description:
      "Slack and email alerts for every auto-refund, escalation, and policy match. Stay in the loop without checking the dashboard.",
    pricing: "Included in all plans",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
];

const INTEGRATIONS: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    category: "payment",
    required: true,
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#635BFF" />
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.076c0 4.72 2.766 6.084 6.29 7.432 2.345.893 3.145 1.56 3.145 2.562 0 .974-.845 1.567-2.358 1.567-1.905 0-4.932-1.019-6.98-2.37l-.907 5.578C4.548 22.857 7.657 24 11.28 24c2.582 0 4.716-.636 6.234-1.854 1.637-1.311 2.486-3.199 2.486-5.584 0-4.847-2.94-6.226-6.024-7.412z" fill="white" transform="scale(0.5) translate(7,5)" />
      </svg>
    ),
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "payment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#003087" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">PP</text>
      </svg>
    ),
  },
  {
    id: "braintree",
    name: "Braintree",
    category: "payment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#2d2d2d" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BT</text>
      </svg>
    ),
  },
  {
    id: "adyen",
    name: "Adyen",
    category: "payment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#0abf53" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
      </svg>
    ),
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "payment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#96bf48" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>
      </svg>
    ),
  },
  {
    id: "klarna",
    name: "Klarna",
    category: "payment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#ffb3c7" />
        <text x="12" y="16" textAnchor="middle" fill="#0a0b09" fontSize="10" fontWeight="bold">K</text>
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#4A154B" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#</text>
      </svg>
    ),
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#EA4335" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">M</text>
      </svg>
    ),
  },
  {
    id: "zendesk",
    name: "Zendesk",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#03363D" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Z</text>
      </svg>
    ),
  },
  {
    id: "intercom",
    name: "Intercom",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#286EFA" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">I</text>
      </svg>
    ),
  },
  {
    id: "chargebee",
    name: "Chargebee",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#FF6C37" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">CB</text>
      </svg>
    ),
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "enrichment",
    connected: false,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#FF7A59" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">H</text>
      </svg>
    ),
  },
];

/* ─── Step indicator ─── */

const STEPS = [
  { label: "Select Products", num: 1 },
  { label: "Connect Integrations", num: 2 },
  { label: "Set Up Protection", num: 3 },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = step.num === current;
        const isDone = step.num < current;
        return (
          <div key={step.num} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : isDone
                    ? "bg-brand-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-gray-900" : isDone ? "text-brand-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-4 h-[2px] w-16 sm:w-24 ${
                  step.num < current ? "bg-brand-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Select Products ─── */

function SelectProducts({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          First, Select Your Qarta Products
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Join hundreds of SaaS businesses that trust Qarta to protect their Stripe dispute ratio
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((product) => {
          const isSelected = selected.has(product.id);
          return (
            <button
              key={product.id}
              onClick={() => onToggle(product.id)}
              className={`group relative flex flex-col rounded-xl border-2 bg-white p-6 text-left transition-all hover:shadow-md ${
                isSelected
                  ? "border-brand-600 shadow-sm ring-1 ring-brand-600/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Checkbox */}
              <div className="absolute right-4 top-4">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                    isSelected
                      ? "border-brand-600 bg-brand-600"
                      : "border-gray-300 group-hover:border-gray-400"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Icon */}
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                  isSelected
                    ? "bg-brand-100 text-brand-600"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                }`}
              >
                {product.icon}
              </div>

              {/* Badge */}
              {product.badge && (
                <span
                  className={`mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    product.badgeColor ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {product.badge}
                </span>
              )}

              {/* Name */}
              <h3 className="text-base font-semibold text-gray-900">
                {product.name}
              </h3>

              {/* Description */}
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">
                {product.description}
              </p>

              {/* Pricing */}
              <div className="mt-4 border-t border-gray-100 pt-3">
                <span className="text-xs font-medium text-gray-400">
                  {product.pricing}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 2: Connect Integrations ─── */

function ConnectIntegrations({
  integrations,
  onToggle,
}: {
  integrations: Integration[];
  onToggle: (id: string) => void;
}) {
  const processors = integrations.filter((i) => i.category === "payment");
  const enrichment = integrations.filter((i) => i.category === "enrichment");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Connect Your Integrations
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Connect your payment processor to get started. The more data sources you connect, the better your protection.
        </p>
      </div>

      {/* Security badges */}
      <div className="mt-6 flex items-center justify-center gap-4">
        {["SOC 2", "GDPR", "PCI DSS"].map((badge) => (
          <span
            key={badge}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {badge}
          </span>
        ))}
      </div>

      {/* Payment Processors */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Payment Processors
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {processors.map((integration) => (
            <button
              key={integration.id}
              onClick={() => onToggle(integration.id)}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 bg-white p-5 transition-all hover:shadow-md ${
                integration.connected
                  ? "border-brand-600 ring-1 ring-brand-600/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {integration.connected && (
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
              {integration.required && (
                <span className="absolute left-1.5 top-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  Required
                </span>
              )}
              {integration.icon}
              <span className="text-sm font-medium text-gray-700">
                {integration.name}
              </span>
              {!integration.connected && (
                <span className="text-xs text-gray-400 group-hover:text-brand-600">
                  + Connect
                </span>
              )}
              {integration.connected && (
                <span className="text-xs font-medium text-brand-600">
                  Connected
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Data Enrichment */}
      <div className="mt-10">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Data Enrichment
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Connect additional tools to improve alert context and automate notifications
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {enrichment.map((integration) => (
            <button
              key={integration.id}
              onClick={() => onToggle(integration.id)}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 bg-white p-5 transition-all hover:shadow-md ${
                integration.connected
                  ? "border-brand-600 ring-1 ring-brand-600/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {integration.connected && (
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
              {integration.icon}
              <span className="text-sm font-medium text-gray-700">
                {integration.name}
              </span>
              {!integration.connected && (
                <span className="text-xs text-gray-400 group-hover:text-brand-600">
                  + Connect
                </span>
              )}
              {integration.connected && (
                <span className="text-xs font-medium text-brand-600">
                  Connected
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Set Up Protection ─── */

function SetUpProtection({
  config,
  onChange,
}: {
  config: ProtectionConfig;
  onChange: (c: ProtectionConfig) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Set Up Your Protection Policy
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Configure your initial auto-refund policy. You can always adjust these settings later.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {/* Recommended preset */}
        <button
          onClick={() =>
            onChange({
              maxAmount: 5000,
              maxRefundsPerDay: 10,
              maxPerCustomer: 2,
              autoRefundEnabled: true,
              preset: "recommended",
            })
          }
          className={`w-full rounded-xl border-2 bg-white p-6 text-left transition-all hover:shadow-md ${
            config.preset === "recommended"
              ? "border-brand-600 ring-1 ring-brand-600/20"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recommended Settings
                </h3>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  Best for most SaaS
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Auto-refund up to $50 per transaction, max 10 refunds/day, max 2 per customer. Balanced protection with safety rails.
              </p>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                config.preset === "recommended"
                  ? "border-brand-600 bg-brand-600"
                  : "border-gray-300"
              }`}
            >
              {config.preset === "recommended" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>

        {/* Conservative preset */}
        <button
          onClick={() =>
            onChange({
              maxAmount: 2500,
              maxRefundsPerDay: 5,
              maxPerCustomer: 1,
              autoRefundEnabled: true,
              preset: "conservative",
            })
          }
          className={`w-full rounded-xl border-2 bg-white p-6 text-left transition-all hover:shadow-md ${
            config.preset === "conservative"
              ? "border-brand-600 ring-1 ring-brand-600/20"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Conservative
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Auto-refund up to $25, max 5 refunds/day, max 1 per customer. Start cautious, scale up later.
              </p>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                config.preset === "conservative"
                  ? "border-brand-600 bg-brand-600"
                  : "border-gray-300"
              }`}
            >
              {config.preset === "conservative" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>

        {/* Custom preset */}
        <div
          className={`rounded-xl border-2 bg-white p-6 transition-all ${
            config.preset === "custom"
              ? "border-brand-600 ring-1 ring-brand-600/20"
              : "border-gray-200"
          }`}
        >
          <button
            onClick={() =>
              onChange({ ...config, preset: "custom" })
            }
            className="flex w-full items-start justify-between text-left"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Custom Configuration
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Set your own thresholds and safety rails
              </p>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                config.preset === "custom"
                  ? "border-brand-600 bg-brand-600"
                  : "border-gray-300"
              }`}
            >
              {config.preset === "custom" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </button>

          {config.preset === "custom" && (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max amount (cents)
                </label>
                <input
                  type="number"
                  value={config.maxAmount}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      maxAmount: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="5000"
                />
                <p className="mt-1 text-xs text-gray-400">
                  = ${(config.maxAmount / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max refunds / day
                </label>
                <input
                  type="number"
                  value={config.maxRefundsPerDay}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      maxRefundsPerDay: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max per customer
                </label>
                <input
                  type="number"
                  value={config.maxPerCustomer}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      maxPerCustomer: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="2"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Protection config type ─── */

interface ProtectionConfig {
  maxAmount: number;
  maxRefundsPerDay: number;
  maxPerCustomer: number;
  autoRefundEnabled: boolean;
  preset: "recommended" | "conservative" | "custom";
}

/* ─── Main Onboarding Page ─── */

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(["deflection", "alerts"])
  );
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [protectionConfig, setProtectionConfig] = useState<ProtectionConfig>({
    maxAmount: 5000,
    maxRefundsPerDay: 10,
    maxPerCustomer: 2,
    autoRefundEnabled: true,
    preset: "recommended",
  });

  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, connected: !i.connected } : i
      )
    );
  };

  const [launching, setLaunching] = useState(false);

  const completeOnboarding = async () => {
    setLaunching(true);
    try {
      // Create the initial protection policy from onboarding config (skip for demo mode)
      if (!isDemoMode()) {
        await createPolicy({
          name: protectionConfig.preset === "recommended"
            ? "Auto-refund (recommended)"
            : protectionConfig.preset === "conservative"
            ? "Auto-refund (conservative)"
            : "Auto-refund (custom)",
          priority: 1,
          conditions: [
            { field: "amount", operator: "lte", value: protectionConfig.maxAmount },
            { field: "source", operator: "in", value: ["stripe_efw", "stripe_dispute"] },
          ],
          action: { type: "auto_refund", cancelSubscription: false },
          safetyRails: {
            maxRefundsPerDay: protectionConfig.maxRefundsPerDay,
            maxRefundsPerCustomer: protectionConfig.maxPerCustomer,
            maxRefundAmount: protectionConfig.maxAmount,
          },
        });
      }
    } catch {
      // Don't block onboarding if policy creation fails — they can create later
    } finally {
      setLaunching(false);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("qarta_onboarding_complete", "true");
    }
    router.push("/");
  };

  const canContinue = () => {
    if (step === 1) return selectedProducts.size > 0;
    if (step === 2) return integrations.some((i) => i.connected);
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-sm font-bold text-white">Q</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Qarta</span>
          </div>

          {/* Stepper */}
          <Stepper current={step} />

          {/* Actions */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:support@qarta.eu"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Need help? Contact Us
            </a>
            <button
              onClick={completeOnboarding}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-12">
        {step === 1 && (
          <SelectProducts
            selected={selectedProducts}
            onToggle={toggleProduct}
          />
        )}
        {step === 2 && (
          <ConnectIntegrations
            integrations={integrations}
            onToggle={toggleIntegration}
          />
        )}
        {step === 3 && (
          <SetUpProtection
            config={protectionConfig}
            onChange={setProtectionConfig}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to {STEPS[step - 2]?.label}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {step < 3 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Or skip this step
              </button>
            )}
            <button
              onClick={() => {
                if (step < 3) {
                  setStep((s) => s + 1);
                } else {
                  completeOnboarding();
                }
              }}
              disabled={!canContinue() || launching}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {step < 3 ? (
                <>
                  Continue to {STEPS[step]?.label}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </>
              ) : launching ? (
                <>
                  Launching...
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </>
              ) : (
                <>
                  Launch Protection
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
