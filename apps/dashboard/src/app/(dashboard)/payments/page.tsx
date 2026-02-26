"use client";

import { useState, useMemo } from "react";
import { TopBar } from "@/components/top-bar";
import { StatusBadge } from "@/components/status-badge";
import { PaymentDetail } from "@/components/payment-detail";
import { mockPayments, type MockPayment } from "@/lib/mock-data";
import type { PaymentStatus } from "@qarta/shared";

const PAGE_SIZE = 15;

const statusFilters: { label: string; value: PaymentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Refunded", value: "refunded" },
  { label: "Disputed", value: "disputed" },
];

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<MockPayment | null>(null);

  const filtered = useMemo(() => {
    return mockPayments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.id.toLowerCase().includes(q) ||
          p.customerEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <TopBar title="Payments" />
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
              placeholder="Search by ID or email..."
              className="h-9 w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Results count */}
          <span className="ml-auto text-sm text-gray-500">
            {filtered.length} payment{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-6 py-3">Payment ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">
                      <span className="font-mono text-sm text-brand-600">
                        {payment.id}
                      </span>
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {payment.method === "card" ? "Card" : "Crypto"}
                      </span>
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payment detail slide-over */}
        {selectedPayment && (
          <PaymentDetail
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
          />
        )}
      </div>
    </>
  );
}
