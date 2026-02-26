"use client";

import type { MockPayment } from "@/lib/mock-data";
import { StatusBadge } from "./status-badge";

interface PaymentDetailProps {
  payment: MockPayment;
  onClose: () => void;
}

export function PaymentDetail({ payment, onClose }: PaymentDetailProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-[480px] overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="font-mono text-sm text-gray-500">{payment.id}</p>
            <p className="text-lg font-semibold text-gray-900">
              ${(payment.amount / 100).toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-500">
                {payment.currency}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className="mb-6">
            <StatusBadge status={payment.status} />
          </div>

          {/* Details grid */}
          <div className="space-y-4">
            <DetailRow label="Payment ID" value={payment.id} mono />
            <DetailRow
              label="Amount"
              value={`$${(payment.amount / 100).toFixed(2)} ${payment.currency}`}
            />
            <DetailRow label="Status" value={payment.status} />
            <DetailRow
              label="Method"
              value={payment.method === "card" ? "Card" : "Crypto"}
            />
            <DetailRow
              label="Provider"
              value={payment.provider === "stripe" ? "Stripe" : "Coinbase Commerce"}
            />
            <DetailRow label="Customer" value={payment.customerEmail} />
            <DetailRow label="Customer ID" value={payment.customerId} mono />
            <DetailRow
              label="Created"
              value={new Date(payment.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            />
            {payment.declineCode && (
              <DetailRow label="Decline Code" value={payment.declineCode} />
            )}
          </div>

          {/* Timeline */}
          <div className="mt-8">
            <h4 className="mb-4 text-sm font-medium text-gray-900">Timeline</h4>
            <div className="space-y-4">
              <TimelineItem
                label="Payment created"
                time={payment.createdAt}
                status="completed"
              />
              {payment.status === "succeeded" && (
                <>
                  <TimelineItem
                    label="Processing started"
                    time={new Date(
                      new Date(payment.createdAt).getTime() + 1000
                    ).toISOString()}
                    status="completed"
                  />
                  <TimelineItem
                    label="Payment succeeded"
                    time={new Date(
                      new Date(payment.createdAt).getTime() + 3000
                    ).toISOString()}
                    status="completed"
                  />
                </>
              )}
              {payment.status === "failed" && (
                <>
                  <TimelineItem
                    label="Processing started"
                    time={new Date(
                      new Date(payment.createdAt).getTime() + 1000
                    ).toISOString()}
                    status="completed"
                  />
                  <TimelineItem
                    label={`Payment declined: ${payment.declineCode ?? "unknown"}`}
                    time={new Date(
                      new Date(payment.createdAt).getTime() + 2500
                    ).toISOString()}
                    status="failed"
                  />
                </>
              )}
              {(payment.status === "pending" || payment.status === "processing") && (
                <TimelineItem
                  label="Awaiting confirmation"
                  time={new Date().toISOString()}
                  status="pending"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            {payment.status === "succeeded" && (
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Refund
              </button>
            )}
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              View in {payment.provider === "stripe" ? "Stripe" : "Coinbase"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-right text-sm font-medium text-gray-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  status,
}: {
  label: string;
  time: string;
  status: "completed" | "failed" | "pending";
}) {
  const dotColor = {
    completed: "bg-green-500",
    failed: "bg-red-500",
    pending: "bg-yellow-500",
  }[status];

  return (
    <div className="flex items-start gap-3">
      <div className="relative mt-1.5 flex flex-col items-center">
        <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">
          {new Date(time).toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
