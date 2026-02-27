"use client";

import { useState } from "react";

const DISPUTE_RATE = 0.008; // 0.8% — industry average for SaaS
const STRIPE_FEE = 15; // Stripe dispute fee
const DEFLECTION_RATE = 0.7; // 70% deflection with Qarta

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatUsd(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold tabular-nums text-gray-900">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider w-full"
        style={{ "--progress": `${progress}%` } as React.CSSProperties}
      />
      <div className="mt-1.5 flex justify-between text-xs text-gray-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  variant = "neutral",
}: {
  value: string;
  label: string;
  variant?: "neutral" | "danger" | "success" | "brand";
}) {
  const styles = {
    neutral: "bg-gray-50 text-gray-900",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-50 text-brand-600",
  };

  return (
    <div className={`rounded-xl p-5 ${styles[variant]}`}>
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

export function Calculator() {
  const [transactions, setTransactions] = useState(5000);
  const [avgValue, setAvgValue] = useState(65);

  const disputes = Math.round(transactions * DISPUTE_RATE);
  const costPerDispute = avgValue + STRIPE_FEE;
  const currentLoss = disputes * costPerDispute;
  const prevented = Math.round(disputes * DEFLECTION_RATE);
  const monthlySavings = prevented * costPerDispute;
  const annualSavings = monthlySavings * 12;

  return (
    <section id="calculator" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Savings Calculator
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            See how much you could save
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Adjust the sliders to match your business. See the real impact of
            proactive chargeback deflection.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {/* Sliders */}
            <div className="space-y-8">
              <SliderInput
                label="Monthly transactions"
                value={transactions}
                min={500}
                max={50000}
                step={500}
                formatValue={formatNumber}
                onChange={setTransactions}
              />
              <SliderInput
                label="Average transaction value"
                value={avgValue}
                min={10}
                max={300}
                step={5}
                formatValue={formatUsd}
                onChange={setAvgValue}
              />
            </div>

            {/* Divider */}
            <div className="my-8 border-t border-gray-100" />

            {/* Results grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                value={String(disputes)}
                label="Disputes / month"
                variant="neutral"
              />
              <StatCard
                value={formatUsd(currentLoss)}
                label="Monthly loss today"
                variant="danger"
              />
              <StatCard
                value={String(prevented)}
                label="Prevented by Qarta"
                variant="success"
              />
              <StatCard
                value={formatUsd(monthlySavings)}
                label="Saved / month"
                variant="brand"
              />
            </div>

            {/* Annual savings highlight */}
            <div className="mt-4 overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 p-6 text-center sm:mt-6 sm:p-8">
              <div className="text-sm font-medium text-white/70">
                Estimated annual savings
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums text-white sm:text-5xl">
                {formatUsd(annualSavings)}
              </div>
              <div className="mx-auto mt-3 max-w-md text-xs text-white/50">
                Based on {(DISPUTE_RATE * 100).toFixed(1)}% dispute rate and $
                {STRIPE_FEE} Stripe fee per dispute. Qarta typically deflects{" "}
                {DEFLECTION_RATE * 100}% of pre-disputes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
