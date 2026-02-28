"use client";

import { useState, useEffect } from "react";
import type { Policy, PolicyCondition } from "@qarta/shared";

/* ─── Types ─── */

interface PolicyFormData {
  name: string;
  priority: number;
  conditions: PolicyCondition[];
  actionType: "auto_refund" | "escalate" | "dismiss";
  cancelSubscription: boolean;
  maxRefundsPerDay: number;
  maxRefundsPerCustomer: number;
  maxRefundAmount: number;
}

interface PolicyFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: PolicyFormData) => Promise<void>;
  policy?: Policy | null;
}

/* ─── Constants ─── */

const CONDITION_FIELDS = [
  { value: "amount", label: "Amount (cents)" },
  { value: "reason_category", label: "Reason category" },
  { value: "source", label: "Alert source" },
  { value: "card_brand", label: "Card brand" },
] as const;

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  amount: [
    { value: "lt", label: "< less than" },
    { value: "lte", label: "<= at most" },
    { value: "gt", label: "> greater than" },
    { value: "gte", label: ">= at least" },
    { value: "eq", label: "= equals" },
  ],
  reason_category: [
    { value: "eq", label: "= equals" },
    { value: "in", label: "in (any of)" },
  ],
  source: [
    { value: "eq", label: "= equals" },
    { value: "in", label: "in (any of)" },
  ],
  card_brand: [
    { value: "eq", label: "= equals" },
    { value: "in", label: "in (any of)" },
  ],
};

const REASON_OPTIONS = [
  "fraudulent",
  "unrecognized",
  "duplicate",
  "product_not_received",
  "product_unacceptable",
  "subscription_canceled",
  "general",
];

const SOURCE_OPTIONS = [
  "stripe_efw",
  "stripe_dispute",
  "stripe_inquiry",
];

const CARD_BRAND_OPTIONS = ["visa", "mastercard", "amex", "discover"];

function getValueOptions(field: string): string[] | null {
  if (field === "reason_category") return REASON_OPTIONS;
  if (field === "source") return SOURCE_OPTIONS;
  if (field === "card_brand") return CARD_BRAND_OPTIONS;
  return null;
}

/* ─── Empty condition ─── */

function emptyCondition(): PolicyCondition {
  return { field: "amount", operator: "lte", value: 10000 };
}

/* ─── Default form data ─── */

function defaultFormData(): PolicyFormData {
  return {
    name: "",
    priority: 1,
    conditions: [emptyCondition()],
    actionType: "auto_refund",
    cancelSubscription: false,
    maxRefundsPerDay: 10,
    maxRefundsPerCustomer: 2,
    maxRefundAmount: 10000,
  };
}

function policyToFormData(p: Policy): PolicyFormData {
  return {
    name: p.name,
    priority: p.priority,
    conditions: [...p.conditions],
    actionType: p.action.type,
    cancelSubscription: p.action.cancelSubscription ?? false,
    maxRefundsPerDay: p.safetyRails.maxRefundsPerDay,
    maxRefundsPerCustomer: p.safetyRails.maxRefundsPerCustomer,
    maxRefundAmount: p.safetyRails.maxRefundAmount,
  };
}

/* ─── PolicyForm Component ─── */

export function PolicyForm({ open, onClose, onSave, policy }: PolicyFormProps) {
  const [form, setForm] = useState<PolicyFormData>(defaultFormData());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!policy;

  useEffect(() => {
    if (open) {
      setForm(policy ? policyToFormData(policy) : defaultFormData());
      setError(null);
    }
  }, [open, policy]);

  const updateCondition = (index: number, updates: Partial<PolicyCondition>) => {
    setForm((prev) => {
      const conditions = [...prev.conditions];
      const current = conditions[index]!;
      const updated = { ...current, ...updates };

      // Reset value/operator when field changes
      if (updates.field && updates.field !== current.field) {
        const ops = OPERATORS[updates.field];
        updated.operator = (ops?.[0]?.value ?? "eq") as PolicyCondition["operator"];
        updated.value = updates.field === "amount" ? 10000 : "";
      }

      // Reset value when operator changes to "in"
      if (updates.operator === "in" && current.operator !== "in") {
        updated.value = [];
      } else if (updates.operator && updates.operator !== "in" && current.operator === "in") {
        updated.value = updated.field === "amount" ? 10000 : "";
      }

      conditions[index] = updated;
      return { ...prev, conditions };
    });
  };

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, emptyCondition()],
    }));
  };

  const removeCondition = (index: number) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Policy name is required");
      return;
    }
    if (form.conditions.length === 0) {
      setError("At least one condition is required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Policy" : "New Policy"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Name & Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Policy name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Auto-refund small fraud alerts"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-gray-400">Lower = evaluated first</p>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Conditions
              </label>
              <p className="mb-3 text-xs text-gray-400">
                All conditions must match for this policy to trigger (AND logic)
              </p>
              <div className="space-y-3">
                {form.conditions.map((condition, i) => (
                  <ConditionRow
                    key={i}
                    condition={condition}
                    onChange={(updates) => updateCondition(i, updates)}
                    onRemove={form.conditions.length > 1 ? () => removeCondition(i) : undefined}
                  />
                ))}
              </div>
              <button
                onClick={addCondition}
                className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                + Add condition
              </button>
            </div>

            {/* Action */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Action
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { type: "auto_refund" as const, label: "Auto-refund", desc: "Refund automatically" },
                  { type: "escalate" as const, label: "Escalate", desc: "Send to manual review" },
                  { type: "dismiss" as const, label: "Dismiss", desc: "No action needed" },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setForm({ ...form, actionType: opt.type })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      form.actionType === opt.type
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {form.actionType === "auto_refund" && (
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.cancelSubscription}
                    onChange={(e) => setForm({ ...form, cancelSubscription: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  Also cancel the subscription
                </label>
              )}
            </div>

            {/* Safety Rails */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Safety Rails
              </label>
              <p className="mb-3 text-xs text-gray-400">
                Limits to prevent runaway auto-refunds
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Max amount
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={form.maxRefundAmount}
                    onChange={(e) => setForm({ ...form, maxRefundAmount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    = ${(form.maxRefundAmount / 100).toFixed(0)}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Max / day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.maxRefundsPerDay}
                    onChange={(e) => setForm({ ...form, maxRefundsPerDay: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Max / customer
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.maxRefundsPerCustomer}
                    onChange={(e) => setForm({ ...form, maxRefundsPerCustomer: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Update Policy" : "Create Policy"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── ConditionRow ─── */

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: PolicyCondition;
  onChange: (updates: Partial<PolicyCondition>) => void;
  onRemove?: () => void;
}) {
  const ops = OPERATORS[condition.field] ?? OPERATORS.amount!;
  const valueOptions = getValueOptions(condition.field);
  const isMulti = condition.operator === "in";

  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ field: e.target.value as PolicyCondition["field"] })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {CONDITION_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ operator: e.target.value as PolicyCondition["operator"] })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {ops.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Value */}
      <div className="flex-1">
        {condition.field === "amount" ? (
          <div>
            <input
              type="number"
              value={typeof condition.value === "number" ? condition.value : ""}
              onChange={(e) => onChange({ value: Number(e.target.value) })}
              placeholder="Amount in cents"
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {typeof condition.value === "number" && (
              <span className="mt-0.5 block text-xs text-gray-400">
                = ${(condition.value / 100).toFixed(0)}
              </span>
            )}
          </div>
        ) : isMulti && valueOptions ? (
          <MultiSelect
            options={valueOptions}
            selected={Array.isArray(condition.value) ? condition.value : []}
            onChange={(val) => onChange({ value: val })}
          />
        ) : valueOptions ? (
          <select
            value={typeof condition.value === "string" ? condition.value : ""}
            onChange={(e) => onChange({ value: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select...</option>
            {valueOptions.map((v) => (
              <option key={v} value={v}>
                {v.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={typeof condition.value === "string" ? condition.value : ""}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Value"
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="mt-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─── MultiSelect (tag-style) ─── */

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isSelected
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt.replace(/_/g, " ")}
          </button>
        );
      })}
    </div>
  );
}
