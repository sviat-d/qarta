"use client";

import { useState } from "react";
import type { Alert } from "@qarta/shared";
import { resolveAlert } from "@/lib/api";
import { StatusBadge } from "./status-badge";

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
  onResolved?: () => void;
}

const sourceLabels: Record<string, string> = {
  stripe_efw: "Stripe Early Fraud Warning",
  stripe_dispute: "Stripe Dispute",
  stripe_inquiry: "Stripe Inquiry",
  manual: "Manual",
};

export function AlertDetail({ alert, onClose, onResolved }: AlertDetailProps) {
  const [resolving, setResolving] = useState<"refund" | "dismiss" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async (action: "refund" | "dismiss") => {
    setResolving(action);
    setError(null);
    try {
      await resolveAlert(alert.id, action);
      onResolved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setResolving(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-[480px] overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="font-mono text-sm text-gray-500">{alert.id}</p>
            <p className="text-lg font-semibold text-gray-900">
              ${(alert.amount / 100).toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-500">
                {alert.currency}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className="mb-6">
            <StatusBadge status={alert.status} />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Details grid */}
          <div className="space-y-4">
            <DetailRow label="Alert ID" value={alert.id} mono />
            <DetailRow
              label="Amount"
              value={`$${(alert.amount / 100).toFixed(2)} ${alert.currency}`}
            />
            <DetailRow
              label="Source"
              value={sourceLabels[alert.source] ?? alert.source}
            />
            <DetailRow
              label="Reason"
              value={alert.reasonCategory.replace("_", " ")}
            />
            <DetailRow
              label="Actionable"
              value={alert.isActionable ? "Yes" : "No"}
            />
            {alert.customerEmail && (
              <DetailRow label="Customer" value={alert.customerEmail} />
            )}
            {alert.customerId && (
              <DetailRow label="Customer ID" value={alert.customerId} mono />
            )}
            {alert.cardBrand && alert.cardLast4 && (
              <DetailRow
                label="Card"
                value={`${alert.cardBrand.toUpperCase()} ****${alert.cardLast4}`}
              />
            )}
            {alert.stripeChargeId && (
              <DetailRow
                label="Stripe Charge"
                value={alert.stripeChargeId}
                mono
              />
            )}
            {alert.stripeDisputeId && (
              <DetailRow
                label="Stripe Dispute"
                value={alert.stripeDisputeId}
                mono
              />
            )}
            <DetailRow
              label="Created"
              value={new Date(alert.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            />
            {alert.resolvedAt && (
              <DetailRow
                label="Resolved"
                value={new Date(alert.resolvedAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              />
            )}
          </div>

          {/* Timeline */}
          <div className="mt-8">
            <h4 className="mb-4 text-sm font-medium text-gray-900">
              Timeline
            </h4>
            <div className="space-y-4">
              <TimelineItem
                label="Alert received"
                time={new Date(alert.createdAt).toISOString()}
                status="completed"
              />
              {alert.status === "auto_refunded" && (
                <>
                  <TimelineItem
                    label="Policy matched — auto-refund triggered"
                    time={new Date(
                      new Date(alert.createdAt).getTime() + 2000,
                    ).toISOString()}
                    status="completed"
                  />
                  <TimelineItem
                    label="Refund executed via Stripe"
                    time={
                      alert.resolvedAt
                        ? new Date(alert.resolvedAt).toISOString()
                        : new Date(
                            new Date(alert.createdAt).getTime() + 5000,
                          ).toISOString()
                    }
                    status="completed"
                  />
                </>
              )}
              {alert.status === "escalated" && (
                <TimelineItem
                  label="Escalated to manual review"
                  time={new Date(
                    new Date(alert.createdAt).getTime() + 2000,
                  ).toISOString()}
                  status="pending"
                />
              )}
              {alert.status === "manually_resolved" && (
                <>
                  <TimelineItem
                    label="Escalated to manual review"
                    time={new Date(
                      new Date(alert.createdAt).getTime() + 2000,
                    ).toISOString()}
                    status="completed"
                  />
                  <TimelineItem
                    label="Manually resolved by operator"
                    time={
                      alert.resolvedAt
                        ? new Date(alert.resolvedAt).toISOString()
                        : new Date(
                            new Date(alert.createdAt).getTime() + 60000,
                          ).toISOString()
                    }
                    status="completed"
                  />
                </>
              )}
              {alert.status === "dismissed" && (
                <TimelineItem
                  label="Alert dismissed"
                  time={
                    alert.resolvedAt
                      ? new Date(alert.resolvedAt).toISOString()
                      : new Date(
                          new Date(alert.createdAt).getTime() + 3000,
                        ).toISOString()
                  }
                  status="completed"
                />
              )}
              {alert.status === "new" && (
                <TimelineItem
                  label="Awaiting policy evaluation"
                  time={new Date().toISOString()}
                  status="pending"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          {(alert.status === "new" || alert.status === "escalated") && (
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => handleResolve("refund")}
                disabled={resolving !== null}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {resolving === "refund" ? "Refunding..." : "Refund Now"}
              </button>
              <button
                onClick={() => handleResolve("dismiss")}
                disabled={resolving !== null}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {resolving === "dismiss" ? "Dismissing..." : "Dismiss"}
              </button>
            </div>
          )}
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
