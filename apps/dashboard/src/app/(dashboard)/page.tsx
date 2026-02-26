import { TopBar } from "@/components/top-bar";
import { MetricCard } from "@/components/metric-card";
import { RevenueChart } from "@/components/revenue-chart";
import { RecentPayments } from "@/components/recent-payments";
import { mockMetrics } from "@/lib/mock-data";

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
}

export default function OverviewPage() {
  return (
    <>
      <TopBar title="Overview" />
      <div className="p-8">
        {/* Metrics grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(mockMetrics.totalRevenue)}
            change={mockMetrics.revenueChange}
            subtitle="vs last month"
          />
          <MetricCard
            title="Approval Rate"
            value={`${mockMetrics.approvalRate}%`}
            change={mockMetrics.approvalRateChange}
            subtitle="vs last month"
          />
          <MetricCard
            title="Chargeback Rate"
            value={`${mockMetrics.chargebackRate}%`}
            change={mockMetrics.chargebackRateChange}
            subtitle="vs last month"
          />
          <MetricCard
            title="Total Payments"
            value={mockMetrics.totalPayments.toLocaleString()}
            change={mockMetrics.paymentsChange}
            subtitle="vs last month"
          />
        </div>

        {/* Charts row */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-900">Payment Breakdown</h3>
            <p className="text-xs text-gray-500">By status</p>
            <div className="mt-6 space-y-4">
              <BreakdownRow
                label="Succeeded"
                count={mockMetrics.successfulPayments}
                total={mockMetrics.totalPayments}
                color="bg-green-500"
              />
              <BreakdownRow
                label="Failed"
                count={mockMetrics.failedPayments}
                total={mockMetrics.totalPayments}
                color="bg-red-500"
              />
              <BreakdownRow
                label="Pending"
                count={mockMetrics.pendingPayments}
                total={mockMetrics.totalPayments}
                color="bg-yellow-500"
              />
              <BreakdownRow
                label="Disputed"
                count={mockMetrics.disputedPayments}
                total={mockMetrics.totalPayments}
                color="bg-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="mt-8">
          <RecentPayments />
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
  const pct = ((count / total) * 100).toFixed(1);
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
