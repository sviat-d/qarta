import { mockAlerts } from "@/lib/mock-data";
import { StatusBadge } from "./status-badge";
import Link from "next/link";

const sourceLabels: Record<string, { label: string; color: string }> = {
  stripe_efw: { label: "EFW", color: "bg-purple-500" },
  stripe_dispute: { label: "Dispute", color: "bg-red-500" },
  stripe_inquiry: { label: "Inquiry", color: "bg-yellow-500" },
  manual: { label: "Manual", color: "bg-gray-400" },
};

export function RecentAlerts() {
  const recent = mockAlerts.slice(0, 8);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Recent Alerts</h3>
          <p className="text-xs text-gray-500">Latest pre-dispute signals</p>
        </div>
        <Link
          href="/alerts"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
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
            {recent.map((alert) => {
              const src = sourceLabels[alert.source] ?? {
                label: alert.source,
                color: "bg-gray-400",
              };
              return (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <span className="font-mono text-sm text-brand-600">
                      {alert.id}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {alert.customerEmail}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    ${(alert.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                      <span
                        className={`h-2 w-2 rounded-full ${src.color}`}
                      />
                      {src.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 capitalize">
                    {alert.reasonCategory.replace("_", " ")}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
