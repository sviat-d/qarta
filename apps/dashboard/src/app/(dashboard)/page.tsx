"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { fetchOutcomes, fetchTimeseries, fetchAlerts, fetchMe } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { Alert, OutcomesTimeSeries } from "@qarta/shared";

const sourceLabels: Record<string, { label: string; color: string }> = {
  stripe_efw: { label: "EFW", color: "bg-purple-500" },
  stripe_dispute: { label: "Dispute", color: "bg-red-500" },
  stripe_inquiry: { label: "Inquiry", color: "bg-yellow-500" },
  manual: { label: "Manual", color: "bg-gray-400" },
};

/* ─── Donut Chart ─── */

function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="18" />
      {segments.map((segment, i) => {
        const pct = total > 0 ? segment.value / total : 0;
        const dash = circumference * pct;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={i}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-currentOffset}
            transform="rotate(-90 70 70)"
            strokeLinecap="round"
          />
        );
      })}
      <text x="70" y="65" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">
        {total}
      </text>
      <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#6B7280">
        Total
      </text>
    </svg>
  );
}

/* ─── Stacked Bar Chart ─── */

function AlertActivityChart({
  data,
  isLoading,
}: {
  data: OutcomesTimeSeries[];
  isLoading: boolean;
}) {
  const maxAlerts = Math.max(...data.map((d) => d.alerts), 1);
  const chartHeight = 180;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-6"
        style={{ height: chartHeight + 100 }}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Alerts Overview</h3>
          <p className="text-xs text-gray-500">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
            <span className="text-gray-500">Auto-resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
            <span className="text-gray-500">Escalated</span>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-[3px]" style={{ height: chartHeight }}>
        {data.map((day) => {
          const totalHeight = maxAlerts > 0 ? (day.alerts / maxAlerts) * chartHeight : 0;
          const resolvedHeight =
            day.alerts > 0 ? (day.autoResolved / day.alerts) * totalHeight : 0;
          const escalatedHeight = totalHeight - resolvedHeight;
          return (
            <div key={day.date} className="group relative flex-1" style={{ height: chartHeight }}>
              <div className="absolute bottom-0 w-full rounded-t" style={{ height: `${totalHeight}px` }}>
                <div className="w-full rounded-t bg-orange-400" style={{ height: `${escalatedHeight}px` }} />
                <div
                  className="w-full bg-brand-500"
                  style={{
                    height: `${resolvedHeight}px`,
                    borderRadius: escalatedHeight === 0 ? "4px 4px 0 0" : "0",
                  }}
                />
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <p className="font-medium">{day.alerts} alerts</p>
                <p className="text-brand-300">{day.autoResolved} auto-resolved</p>
                <p className="text-orange-300">{day.escalated} escalated</p>
                <p className="text-gray-400">{day.date}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

/* ─── Activation Checklist ─── */

function ActivationChecklist() {
  const [open, setOpen] = useState(true);
  const steps = [
    { label: "Connect Stripe", done: true, href: "/settings" },
    { label: "Configure Auto-Refund Policy", done: false, href: "/policies" },
    { label: "Set Up Notifications", done: false, href: "/settings" },
    { label: "Invite Team Members", done: false, href: "#", soon: true },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
          {completed}
        </div>
        {completed}/{steps.length} Setup Steps
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Setup Checklist</p>
              <span className="text-xs text-gray-500">{completed}/{steps.length} completed</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${(completed / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50 p-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    step.done ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  {step.done ? (
                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span className={`flex-1 text-sm ${step.done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {step.label}
                  {step.soon && <span className="ml-1 text-xs text-gray-400">(Coming soon)</span>}
                </span>
                {!step.done && !step.soon && (
                  <Link href={step.href} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    Start
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card ─── */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

/* ─── Main Dashboard ─── */

export default function OverviewPage() {
  const { data: outcomesData, isLoading: loadingOutcomes } = useApi(
    () => fetchOutcomes(),
    [],
  );
  const { data: timeseriesData, isLoading: loadingChart } = useApi(
    () => fetchTimeseries(30),
    [],
  );
  const { data: alertsData, isLoading: loadingAlerts } = useApi(
    () => fetchAlerts({ page: 1, perPage: 8 }),
    [],
  );
  const { data: meData } = useApi(() => fetchMe(), []);

  const metrics = outcomesData?.data;
  const chartData: OutcomesTimeSeries[] = timeseriesData?.data ?? [];
  const recentAlerts: Alert[] = alertsData?.data ?? [];
  const merchantName = meData?.data?.name ?? "your dashboard";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {merchantName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your chargeback protection
          </p>
        </div>
        <ActivationChecklist />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Chargebacks Prevented"
          value={loadingOutcomes ? "..." : (metrics?.disputesAvoided ?? 0).toLocaleString()}
          subtitle="this month"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
          iconBg="bg-green-100 text-green-600"
        />
        <KpiCard
          title="Chargeback Fees Saved"
          value={
            loadingOutcomes
              ? "..."
              : `$${((metrics?.feesAvoided ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          subtitle="this month"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
          iconBg="bg-blue-100 text-blue-600"
        />
        <KpiCard
          title="Dispute Rate"
          value={loadingOutcomes ? "..." : `${metrics?.disputeRateCurrent ?? 0}%`}
          subtitle={metrics?.disputeRatePrevious ? `was ${metrics.disputeRatePrevious}%` : "current"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          }
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          title="Automation Rate"
          value={loadingOutcomes ? "..." : `${metrics?.automationRate ?? 0}%`}
          subtitle="auto-resolved"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          }
          iconBg="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertActivityChart data={chartData} isLoading={loadingChart} />
        </div>
        {/* Alerts by Source */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Alerts by Source</h3>
          <p className="text-xs text-gray-500">Distribution by alert origin</p>
          {loadingOutcomes ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="mt-4 flex justify-center">
                <DonutChart
                  segments={[
                    { label: "EFW", value: 98, color: "#8b5cf6" },
                    { label: "Dispute", value: 56, color: "#ef4444" },
                    { label: "Inquiry", value: 30, color: "#f59e0b" },
                  ]}
                />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Early Fraud Warning", value: 98, volume: "$24,564", color: "bg-purple-500" },
                  { label: "Dispute", value: 56, volume: "$17,126", color: "bg-red-500" },
                  { label: "Inquiry", value: 30, volume: "$3,431", color: "bg-yellow-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900">{item.value}</span>
                      <span className="ml-2 text-xs text-gray-400">{item.volume}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breakdown row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts by Outcome */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Alerts by Outcome</h3>
          <p className="mb-4 text-xs text-gray-500">How alerts were resolved</p>
          <div className="space-y-3">
            {[
              { label: "Auto-refunded", count: metrics?.alertsAutoResolved ?? 0, volume: "$40,997", color: "bg-brand-500" },
              { label: "Escalated", count: metrics?.alertsEscalated ?? 0, volume: "$2,918", color: "bg-orange-400" },
              { label: "Dismissed", count: metrics?.alertsDismissed ?? 0, volume: "$1,206", color: "bg-gray-400" },
            ].map((item) => {
              const total = metrics?.alertsTotal ?? 1;
              const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="text-xs text-gray-400">{item.volume}</span>
                      <span className="ml-2 text-xs text-gray-400">({pct}%)</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Stripe ratio */}
          <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Stripe Dispute Threshold</span>
              <span className="font-semibold text-gray-900">0.75%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${Math.min(((metrics?.disputeRateCurrent ?? 0) / 0.75) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              You&apos;re at {metrics?.disputeRateCurrent ?? 0}% — well below Stripe&apos;s monitoring threshold
            </p>
          </div>
        </div>

        {/* Alerts by Reason */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Alerts by Reason</h3>
          <p className="mb-4 text-xs text-gray-500">Top dispute reason categories</p>
          <div className="space-y-3">
            {[
              { label: "Fraudulent", count: 82, pct: 44.6 },
              { label: "Subscription Canceled", count: 48, pct: 26.1 },
              { label: "Product Not Received", count: 28, pct: 15.2 },
              { label: "Duplicate", count: 16, pct: 8.7 },
              { label: "General", count: 10, pct: 5.4 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-right">
                    <span className="font-semibold text-gray-900">{item.count}</span>
                    <span className="ml-2 text-xs text-gray-400">({item.pct}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-brand-400" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="mt-6 rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent Alerts</h3>
            <p className="text-xs text-gray-500">Latest pre-dispute signals</p>
          </div>
          <Link href="/alerts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loadingAlerts ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : recentAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400">No alerts yet. Waiting for Stripe webhooks.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-6 py-3">Alert ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAlerts.map((alert) => {
                  const src = sourceLabels[alert.source] ?? { label: alert.source, color: "bg-gray-400" };
                  return (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="font-mono text-sm text-brand-600">{alert.id}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{alert.customerEmail ?? "\u2014"}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">${(alert.amount / 100).toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <span className={`h-2 w-2 rounded-full ${src.color}`} />
                          {src.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm capitalize text-gray-500">{alert.reasonCategory.replace("_", " ")}</td>
                      <td className="px-6 py-3"><StatusBadge status={alert.status} /></td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
