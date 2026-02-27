"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/top-bar";
import { StatusBadge } from "@/components/status-badge";
import { AlertDetail } from "@/components/payment-detail";
import { getAlerts } from "@/lib/api";
import { useDebounce } from "@/lib/use-debounce";
import type { Alert, AlertStatus } from "@qarta/shared";

const PAGE_SIZE = 15;

const statusFilters: { label: string; value: AlertStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Auto-Refunded", value: "auto_refunded" },
  { label: "Escalated", value: "escalated" },
  { label: "Resolved", value: "manually_resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const sourceLabels: Record<string, { label: string; color: string }> = {
  stripe_efw: { label: "EFW", color: "bg-purple-500" },
  stripe_dispute: { label: "Dispute", color: "bg-red-500" },
  stripe_inquiry: { label: "Inquiry", color: "bg-yellow-500" },
  manual: { label: "Manual", color: "bg-gray-400" },
};

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAlerts({
        page,
        perPage: PAGE_SIZE,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      });
      setAlerts(res.data);
      setTotal(res.meta.total);
    } catch {
      // handled by api client (401 redirect)
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleAlertResolved = () => {
    setSelectedAlert(null);
    fetchAlerts();
  };

  return (
    <>
      <TopBar title="Alerts" />
      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-brand-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, email, or charge..."
              className="h-9 w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <span className="ml-auto text-sm text-gray-500">
            {total} alert{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
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
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No alerts found
            </div>
          ) : (
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
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
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
                          {new Date(alert.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alert detail slide-over */}
        {selectedAlert && (
          <AlertDetail
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
            onResolved={handleAlertResolved}
          />
        )}
      </div>
    </>
  );
}
