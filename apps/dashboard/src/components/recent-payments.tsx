"use client";

import { useState, useEffect } from "react";
import { getAlerts } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import Link from "next/link";
import type { Alert } from "@qarta/shared";

const sourceLabels: Record<string, { label: string; color: string }> = {
  stripe_efw: { label: "EFW", color: "bg-purple-500" },
  stripe_dispute: { label: "Dispute", color: "bg-red-500" },
  stripe_inquiry: { label: "Inquiry", color: "bg-yellow-500" },
  manual: { label: "Manual", color: "bg-gray-400" },
};

export function RecentAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts({ perPage: 8 })
      .then((res) => setAlerts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-8">
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
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No alerts yet</p>
      </div>
    );
  }

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
            {alerts.map((alert) => {
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
                    {alert.customerEmail ?? "—"}
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
                  <td className="px-6 py-3 text-sm capitalize text-gray-500">
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
