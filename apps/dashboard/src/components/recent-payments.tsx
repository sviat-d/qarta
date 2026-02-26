import { mockPayments } from "@/lib/mock-data";
import { StatusBadge } from "./status-badge";
import Link from "next/link";

export function RecentPayments() {
  const recent = mockPayments.slice(0, 8);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Recent Payments</h3>
          <p className="text-xs text-gray-500">Latest transactions</p>
        </div>
        <Link
          href="/payments"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
              <th className="px-6 py-3">Payment ID</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <Link
                    href={`/payments?id=${payment.id}`}
                    className="font-mono text-sm text-brand-600 hover:text-brand-700"
                  >
                    {payment.id}
                  </Link>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {payment.customerEmail}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  ${(payment.amount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    {payment.provider === "stripe" ? (
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                    {payment.provider === "stripe" ? "Stripe" : "Coinbase"}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">
                  {new Date(payment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
