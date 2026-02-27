"use client";

import { TopBar } from "@/components/top-bar";
import { fetchPolicies, togglePolicy, deletePolicy } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { Policy } from "@qarta/shared";

const actionLabels: Record<string, string> = {
  auto_refund: "Auto-refund",
  escalate: "Escalate to manual review",
  dismiss: "Dismiss",
};

function formatConditions(policy: Policy): string {
  return policy.conditions
    .map((c) => {
      const op = { lt: "<", lte: "<=", gt: ">", gte: ">=", eq: "=", in: "in" }[c.operator] ?? c.operator;
      const val = Array.isArray(c.value) ? `[${c.value.join(", ")}]` : c.field === "amount" ? `$${(Number(c.value) / 100).toFixed(0)}` : String(c.value);
      return `${c.field} ${op} ${val}`;
    })
    .join(" AND ");
}

export default function PoliciesPage() {
  const { data, isLoading, refetch } = useApi(() => fetchPolicies(), []);

  const policies = data?.data ?? [];

  const handleToggle = async (policy: Policy) => {
    await togglePolicy(policy.id, !policy.enabled);
    refetch();
  };

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Delete policy "${policy.name}"?`)) return;
    await deletePolicy(policy.id);
    refetch();
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
          <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            + New Policy
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No policies yet. Create your first auto-refund policy to start
              deflecting chargebacks automatically.
            </p>
            <button className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">
              + Create your first policy
            </button>
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                      #{policy.priority}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {policy.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">
                        {formatConditions(policy)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {actionLabels[policy.action.type] ?? policy.action.type}
                    </span>
                    <button
                      onClick={() => handleToggle(policy)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        policy.enabled ? "bg-brand-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          policy.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(policy)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Max per day</p>
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
                    <p className="text-xs text-gray-500">Max amount</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${(policy.safetyRails.maxRefundAmount / 100).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.enabled ? "Active" : "Disabled"}
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
          <button className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">
            + Add another policy
          </button>
        </div>
      </div>
    </>
  );
}
