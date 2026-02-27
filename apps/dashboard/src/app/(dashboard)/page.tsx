"use client";

import { TopBar } from "@/components/top-bar";
import { MetricCard } from "@/components/metric-card";
import { AlertChart } from "@/components/revenue-chart";
import { RecentAlerts } from "@/components/recent-payments";
import { fetchOutcomes } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function OverviewPage() {
  const { data, isLoading } = useApi(() => fetchOutcomes(), []);

  const metrics = data?.data;

  return (
    <>
      <TopBar title="Overview" />
      <div className="p-8">
        {/* Key outcomes metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Disputes Avoided"
            value={isLoading ? "..." : (metrics?.disputesAvoided ?? 0).toString()}
            change={metrics ? 12 : undefined}
            subtitle="this month"
          />
          <MetricCard
            title="Dispute Rate"
            value={isLoading ? "..." : `${metrics?.disputeRateCurrent ?? 0}%`}
            change={metrics?.disputeRatePrevious ? Math.round(((metrics.disputeRateCurrent - metrics.disputeRatePrevious) / metrics.disputeRatePrevious) * 100) : undefined}
            subtitle={metrics?.disputeRatePrevious ? `was ${metrics.disputeRatePrevious}%` : undefined}
          />
          <MetricCard
            title="Fees Saved"
            value={isLoading ? "..." : `$${((metrics?.feesAvoided ?? 0) / 100).toLocaleString()}`}
            change={metrics ? 18 : undefined}
            subtitle="this month"
          />
          <MetricCard
            title="Automation Rate"
            value={isLoading ? "..." : `${metrics?.automationRate ?? 0}%`}
            change={metrics ? 5.2 : undefined}
            subtitle="auto-resolved"
          />
        </div>

        {/* Chart + breakdown row */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertChart />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-900">
              Alert Breakdown
            </h3>
            <p className="text-xs text-gray-500">By resolution</p>
            <div className="mt-6 space-y-4">
              <BreakdownRow
                label="Auto-Refunded"
                count={metrics?.alertsAutoResolved ?? 0}
                total={metrics?.alertsTotal ?? 1}
                color="bg-green-500"
              />
              <BreakdownRow
                label="Escalated"
                count={metrics?.alertsEscalated ?? 0}
                total={metrics?.alertsTotal ?? 1}
                color="bg-orange-500"
              />
              <BreakdownRow
                label="Dismissed"
                count={metrics?.alertsDismissed ?? 0}
                total={metrics?.alertsTotal ?? 1}
                color="bg-gray-400"
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
                    width: `${((metrics?.disputeRateCurrent ?? 0) / 0.75) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                You&apos;re at {metrics?.disputeRateCurrent ?? 0}% — well below
                monitoring
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
