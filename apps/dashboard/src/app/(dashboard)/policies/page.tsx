"use client";

import { TopBar } from "@/components/top-bar";
import { mockPolicies } from "@/lib/mock-data";

export default function PoliciesPage() {
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

        <div className="space-y-4">
          {mockPolicies.map((policy) => (
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
                      {policy.conditions}
                    </p>
                  </div>
                </div>

                {/* Status + toggle */}
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {policy.action}
                  </span>
                  <button
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
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-500">Refunds today</p>
                  <p className="text-sm font-medium text-gray-900">
                    {policy.refundsToday} / {policy.maxPerDay}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max per day</p>
                  <p className="text-sm font-medium text-gray-900">
                    {policy.maxPerDay}
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

        {/* Empty state for adding more */}
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
