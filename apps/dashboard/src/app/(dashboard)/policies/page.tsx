"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/top-bar";
import { getPolicies, deletePolicy } from "@/lib/api";
import type { Policy, PolicyCondition } from "@qarta/shared";

function formatCondition(c: PolicyCondition): string {
  const ops: Record<string, string> = {
    eq: "=",
    lt: "<",
    lte: "≤",
    gt: ">",
    gte: "≥",
    in: "in",
  };
  const op = ops[c.operator] ?? c.operator;
  const val = Array.isArray(c.value)
    ? `[${c.value.join(", ")}]`
    : String(c.value);
  return `${c.field} ${op} ${val}`;
}

function formatAction(action: {
  type: string;
  cancelSubscription?: boolean;
}): string {
  const labels: Record<string, string> = {
    auto_refund: "Auto-refund",
    escalate: "Escalate",
    dismiss: "Dismiss",
  };
  let label = labels[action.type] ?? action.type;
  if (action.cancelSubscription) label += " + cancel subscription";
  return label;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await getPolicies();
      setPolicies(res.data);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    setDeleting(id);
    try {
      await deletePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // error
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <TopBar title="Policies" />
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Define rules for how alerts are handled automatically.
            </p>
          </div>
        </div>

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
        ) : policies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No policies yet. Create one to start automating alert resolution.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Priority badge */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                      #{policy.priority}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {policy.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">
                        {policy.conditions.map(formatCondition).join(" AND ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {formatAction(policy.action)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        policy.enabled ? "text-green-700" : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          policy.enabled ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                      {policy.enabled ? "Active" : "Disabled"}
                    </span>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      disabled={deleting === policy.id}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Safety rails details */}
                <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Max refunds/day</p>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.safetyRails.maxRefundsPerDay}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max per customer</p>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.safetyRails.maxRefundsPerCustomer}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max refund amount</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${(policy.safetyRails.maxRefundAmount / 100).toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Policies are evaluated in priority order. First matching policy
            wins.
          </p>
        </div>
      </div>
    </>
  );
}
