"use client";

import { useState, useCallback } from "react";
import { TopBar } from "@/components/top-bar";
import { StatusBadge } from "@/components/status-badge";
import { AlertDetail } from "@/components/payment-detail";
import { fetchAlerts } from "@/lib/api";
import { useApi } from "@/lib/use-api";
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

const sourceLabels: Record<string, { label: string; color: string; bg: string }> = {
  stripe_efw: { label: "EFW", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  stripe_dispute: { label: "Dispute", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  stripe_inquiry: { label: "Inquiry", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  manual: { label: "Manual", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

const sourceDotColors: Record<string, string> = {
  stripe_efw: "bg-purple-500",
  stripe_dispute: "bg-red-500",
  stripe_inquiry: "bg-amber-500",
  manual: "bg-gray-400",
};

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const { data, isLoading, refetch } = useApi(
    () =>
      fetchAlerts({
        page,
        perPage: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
      }),
    [page, statusFilter, search],
  );

  const alerts = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const sourceCounts = alerts.reduce(
    (acc, a) => {
      acc[a.source] = (acc[a.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filteredAlerts =
    sourceFilter === "all"
      ? alerts
      : alerts.filter((a) => a.source === sourceFilter);

  const handleResolve = useCallback(() => {
    setSelectedAlert(null);
    refetch();
  }, [refetch]);

  return (
    <>
      <TopBar title="Alerts" />
      <div className="p-8">
        {/* Source cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setSourceFilter("all")}
            className={`rounded-2xl border p-5 text-left shadow-card hover:shadow-card-hover ${
              sourceFilter === "all"
                ? "border-brand-500/30 bg-brand-50 ring-1 ring-brand-500/10"
                : "border-gray-100 bg-white"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">All Sources</p>
            <p className="mt-2 text-[26px] font-bold leading-none tracking-[-0.02em] text-gray-900">{total}</p>
          </button>
          {(["stripe_efw", "stripe_dispute", "stripe_inquiry"] as const).map((source) => {
            const info = sourceLabels[source]!;
            const count = sourceCounts[source] ?? 0;
            const isActive = sourceFilter === source;
            return (
              <button
                key={source}
                onClick={() => setSourceFilter(isActive ? "all" : source)}
                className={`rounded-2xl border p-5 text-left shadow-card hover:shadow-card-hover ${
                  isActive
                    ? `${info.bg} ring-1 ring-brand-500/10`
                    : "border-gray-100 bg-white"
                }`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? info.color : "text-gray-400"}`}>
                  {info.label}
                </p>
                <p className="mt-2 text-[26px] font-bold leading-none tracking-[-0.02em] text-gray-900">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-card">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide ${
                  statusFilter === f.value
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300"
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
              placeholder="Search by email..."
              className="h-9 w-72 rounded-xl border border-gray-100 bg-white pl-10 pr-3 text-[12px] font-medium text-gray-900 shadow-card placeholder:text-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
            />
          </div>

          <span className="ml-auto text-[12px] font-medium text-gray-400">
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-[13px] font-medium text-gray-400">No alerts found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAlerts.map((alert) => {
                    const dotColor = sourceDotColors[alert.source] ?? "bg-gray-400";
                    const srcLabel = sourceLabels[alert.source]?.label ?? alert.source;
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className="cursor-pointer hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-[12px] font-medium text-brand-600">
                            {alert.id}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={alert.status} />
                        </td>
                        <td className="px-6 py-3.5 text-[12px] font-medium text-gray-600">
                          {alert.customerEmail ?? "\u2014"}
                        </td>
                        <td className="px-6 py-3.5 text-[13px] font-semibold text-gray-900">
                          ${(alert.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                            {srcLabel}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[12px] font-medium capitalize text-gray-400">
                          {alert.reasonCategory.replace("_", " ")}
                        </td>
                        <td className="px-6 py-3.5 text-[12px] font-medium text-gray-400">
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
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-50 px-6 py-3">
              <p className="text-[12px] font-medium text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-100 px-4 py-1.5 text-[12px] font-semibold text-gray-600 shadow-card hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-100 px-4 py-1.5 text-[12px] font-semibold text-gray-600 shadow-card hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedAlert && (
          <AlertDetail
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
            onResolve={handleResolve}
          />
        )}
      </div>
    </>
  );
}
