"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/top-bar";
import { MetricCard } from "@/components/metric-card";
import { AlertChart } from "@/components/revenue-chart";
import { RecentAlerts } from "@/components/recent-payments";
import { getOutcomes, getTimeseries } from "@/lib/api";
import type { OutcomesMetrics, OutcomesTimeSeries } from "@qarta/shared";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OutcomesMetrics | null>(null);
  const [timeseries, setTimeseries] = useState<OutcomesTimeSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOutcomes(), getTimeseries()])
      .then(([outRes, tsRes]) => {
        setMetrics(outRes.data ?? null);
        setTimeseries(tsRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <TopBar title="Overview" />
        <div className="flex items-center justify-center p-16">
          <svg
            className="h-5 w-5 animate-spin text-brand-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </>
    );
  }

  if (!metrics) {
    return (
      <>
        <TopBar title="Overview" />
        <div className="p-8">
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">
              No data yet. Connect your Stripe account to start receiving
              alerts.
            </p>
          </div>
        </div>
      </>
    );
  }

  const alertsNew =
    metrics.alertsTotal -
    metrics.alertsAutoResolved -
    metrics.alertsEscalated -
    metrics.alertsDismissed;

  return (
    <>
      <TopBar title="Overview" />
      <div className="p-8">
        {/* Key outcomes metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Disputes Avoided"
            value={metrics.disputesAvoided.toString()}
            subtitle="this month"
          />
          <MetricCard
            title="Dispute Rate"
            value={`${metrics.disputeRateCurrent}%`}
            subtitle={`was ${metrics.disputeRatePrevious}%`}
          />
          <MetricCard
            title="Fees Saved"
            value={`$${(metrics.feesAvoided / 100).toLocaleString()}`}
            subtitle="this month"
          />
          <MetricCard
            title="Automation Rate"
            value={`${metrics.automationRate}%`}
            subtitle="auto-resolved"
          />
        </div>

        {/* Chart + breakdown row */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertChart data={timeseries} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-900">
              Alert Breakdown
            </h3>
            <p className="text-xs text-gray-500">By resolution</p>
            <div className="mt-6 space-y-4">
              <BreakdownRow
                label="Auto-Refunded"
                count={metrics.alertsAutoResolved}
                total={metrics.alertsTotal}
                color="bg-green-500"
              />
              <BreakdownRow
                label="Escalated"
                count={metrics.alertsEscalated}
                total={metrics.alertsTotal}
                color="bg-orange-500"
              />
              <BreakdownRow
                label="Dismissed"
                count={metrics.alertsDismissed}
                total={metrics.alertsTotal}
                color="bg-gray-400"
              />
              <BreakdownRow
                label="Pending"
                count={Math.max(0, alertsNew)}
                total={metrics.alertsTotal}
                color="bg-blue-500"
              />
            </div>

            {/* Stripe ratio indicator */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Stripe Threshold</span>
                <span className="font-medium text-gray-900">0.75%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${Math.min(100, (metrics.disputeRateCurrent / 0.75) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                You&apos;re at {metrics.disputeRateCurrent}% —{" "}
                {metrics.disputeRateCurrent < 0.75
                  ? "well below monitoring"
                  : "approaching monitoring threshold"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="mt-8">
          <RecentAlerts />
        </div>
      </div>
    </>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {count.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
