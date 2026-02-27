"use client";

import { useState } from "react";
import { createPolicy } from "@/lib/api";

interface CreatePolicyProps {
  onClose: () => void;
  onCreated: () => void;
}

type ConditionField =
  | "amount"
  | "reason_category"
  | "source"
  | "card_brand"
  | "is_actionable";

interface ConditionRow {
  field: ConditionField;
  operator: string;
  value: string;
}

const fieldOptions: { value: ConditionField; label: string }[] = [
  { value: "amount", label: "Amount (cents)" },
  { value: "reason_category", label: "Reason category" },
  { value: "source", label: "Alert source" },
  { value: "card_brand", label: "Card brand" },
  { value: "is_actionable", label: "Is actionable" },
];

const operatorsByField: Record<ConditionField, { value: string; label: string }[]> = {
  amount: [
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "eq", label: "=" },
  ],
  reason_category: [
    { value: "eq", label: "equals" },
    { value: "in", label: "in" },
  ],
  source: [
    { value: "eq", label: "equals" },
    { value: "in", label: "in" },
  ],
  card_brand: [
    { value: "eq", label: "equals" },
    { value: "in", label: "in" },
  ],
  is_actionable: [{ value: "eq", label: "equals" }],
};

const reasonOptions = [
  "fraudulent",
  "unrecognized",
  "duplicate",
  "product_not_received",
  "product_unacceptable",
  "subscription_canceled",
  "general",
];

const sourceOptions = [
  "stripe_efw",
  "stripe_dispute",
  "stripe_inquiry",
  "manual",
];

function defaultCondition(): ConditionRow {
  return { field: "amount", operator: "lte", value: "" };
}

export function CreatePolicy({ onClose, onCreated }: CreatePolicyProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(100);
  const [conditions, setConditions] = useState<ConditionRow[]>([
    defaultCondition(),
  ]);
  const [actionType, setActionType] = useState<
    "auto_refund" | "escalate" | "dismiss"
  >("auto_refund");
  const [cancelSubscription, setCancelSubscription] = useState(false);
  const [maxRefundsPerDay, setMaxRefundsPerDay] = useState(25);
  const [maxRefundsPerCustomer, setMaxRefundsPerCustomer] = useState(3);
  const [maxRefundAmountDollars, setMaxRefundAmountDollars] = useState(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCondition = (
    index: number,
    updates: Partial<ConditionRow>,
  ) => {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        // Reset operator when field changes
        if (updates.field) {
          const ops = operatorsByField[updates.field];
          updated.operator = ops[0]!.value;
          updated.value = "";
        }
        return updated;
      }),
    );
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, defaultCondition()]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const parseValue = (
    field: ConditionField,
    operator: string,
    raw: string,
  ): string | number | string[] => {
    if (field === "amount") {
      return parseInt(raw, 10) || 0;
    }
    if (field === "is_actionable") {
      return raw === "true" ? "true" : "false";
    }
    if (operator === "in") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Policy name is required");
      return;
    }
    if (conditions.some((c) => !c.value && c.field !== "is_actionable")) {
      setError("All conditions must have a value");
      return;
    }

    setSaving(true);
    try {
      await createPolicy({
        name: name.trim(),
        priority,
        conditions: conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: parseValue(c.field, c.operator, c.value),
        })),
        action: {
          type: actionType,
          ...(actionType === "auto_refund" && cancelSubscription
            ? { cancelSubscription: true }
            : {}),
        },
        safetyRails: {
          maxRefundsPerDay,
          maxRefundsPerCustomer,
          maxRefundAmount: maxRefundAmountDollars * 100,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[540px] flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Policy
          </h2>
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 space-y-6 p-6">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name + Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Policy name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auto-refund small EFW"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                  min={1}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-gray-400">Lower = first</p>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Conditions
              </label>
              <p className="mb-3 text-xs text-gray-400">
                All conditions must match (AND logic)
              </p>
              <div className="space-y-3">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    {/* Field */}
                    <select
                      value={cond.field}
                      onChange={(e) =>
                        updateCondition(idx, {
                          field: e.target.value as ConditionField,
                        })
                      }
                      className="w-40 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {fieldOptions.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        updateCondition(idx, { operator: e.target.value })
                      }
                      className="w-20 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {operatorsByField[cond.field].map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    {cond.field === "is_actionable" ? (
                      <select
                        value={cond.value || "true"}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : cond.field === "reason_category" &&
                      cond.operator === "eq" ? (
                      <select
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">Select...</option>
                        {reasonOptions.map((r) => (
                          <option key={r} value={r}>
                            {r.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : cond.field === "source" && cond.operator === "eq" ? (
                      <select
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">Select...</option>
                        {sourceOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={cond.field === "amount" ? "number" : "text"}
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                        placeholder={
                          cond.operator === "in"
                            ? "value1, value2, ..."
                            : cond.field === "amount"
                              ? "Amount in cents"
                              : "Value"
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    )}

                    {/* Remove */}
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                + Add condition
              </button>
            </div>

            {/* Action */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Action
              </label>
              <div className="flex gap-3">
                {(
                  [
                    { value: "auto_refund", label: "Auto-refund" },
                    { value: "escalate", label: "Escalate" },
                    { value: "dismiss", label: "Dismiss" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActionType(opt.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      actionType === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {actionType === "auto_refund" && (
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cancelSubscription}
                    onChange={(e) => setCancelSubscription(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">
                    Also cancel subscription
                  </span>
                </label>
              )}
            </div>

            {/* Safety Rails */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Safety rails
              </label>
              <p className="mb-3 text-xs text-gray-400">
                Limits to prevent excessive auto-refunds
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Max refunds/day
                  </label>
                  <input
                    type="number"
                    value={maxRefundsPerDay}
                    onChange={(e) =>
                      setMaxRefundsPerDay(parseInt(e.target.value, 10) || 0)
                    }
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Max per customer
                  </label>
                  <input
                    type="number"
                    value={maxRefundsPerCustomer}
                    onChange={(e) =>
                      setMaxRefundsPerCustomer(
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Max amount ($)
                  </label>
                  <input
                    type="number"
                    value={maxRefundAmountDollars}
                    onChange={(e) =>
                      setMaxRefundAmountDollars(
                        parseInt(e.target.value, 10) || 0,
                      )
                    }
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
