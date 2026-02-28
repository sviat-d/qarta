"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { PolicyForm } from "@/components/policy-form";
import { fetchPolicies, createPolicy, updatePolicy, togglePolicy, deletePolicy } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { Policy } from "@qarta/shared";

const actionLabels: Record<string, string> = {
  auto_refund: "Auto-refund",
  escalate: "Escalate to manual review",
  dismiss: "Dismiss",
};

const actionColors: Record<string, string> = {
  auto_refund: "bg-emerald-50 text-emerald-700",
  escalate: "bg-amber-50 text-amber-700",
  dismiss: "bg-gray-100 text-gray-600",
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

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

  const openCreate = () => {
    setEditingPolicy(null);
    setFormOpen(true);
  };

  const openEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormOpen(true);
  };

  const handleSave = async (formData: Parameters<typeof createPolicy>[0] extends infer T ? T : never) => {
    if (editingPolicy) {
      await updatePolicy(editingPolicy.id, formData);
    } else {
      await createPolicy(formData);
    }
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
          <button
            onClick={openCreate}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New Policy
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">No policies yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first auto-refund policy to start
              deflecting chargebacks automatically.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Create your first policy
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => openEdit(policy)}
                    className="flex items-center gap-4 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                      #{policy.priority}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-brand-600">
                        {policy.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">
                        {formatConditions(policy)}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${actionColors[policy.action.type] ?? "bg-gray-100 text-gray-600"}`}>
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
                      onClick={() => openEdit(policy)}
                      className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(policy)}
                      className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
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
                    <p className={`text-sm font-medium ${policy.enabled ? "text-emerald-600" : "text-gray-400"}`}>
                      {policy.enabled ? "Active" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {policies.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Policies are evaluated in priority order. First matching policy
              wins.
            </p>
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              + Add another policy
            </button>
          </div>
        )}
      </div>

      <PolicyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (formData) => {
          await handleSave({
            name: formData.name,
            priority: formData.priority,
            conditions: formData.conditions,
            action: {
              type: formData.actionType,
              cancelSubscription: formData.cancelSubscription,
            },
            safetyRails: {
              maxRefundsPerDay: formData.maxRefundsPerDay,
              maxRefundsPerCustomer: formData.maxRefundsPerCustomer,
              maxRefundAmount: formData.maxRefundAmount,
            },
          });
        }}
        policy={editingPolicy}
      />
    </>
  );
}
