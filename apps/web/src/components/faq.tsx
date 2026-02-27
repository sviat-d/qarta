"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Do I need to change my Stripe integration?",
    answer:
      "No. Qarta connects to your existing Stripe account via OAuth or Stripe App. We listen to webhook events (Early Fraud Warnings, disputes) and execute refunds through the Stripe API. Your checkout flow stays exactly the same.",
  },
  {
    question: "What are Early Fraud Warnings (EFWs)?",
    answer:
      "EFWs are pre-dispute signals that Stripe receives from card networks. They arrive hours or days before a chargeback is filed. If you proactively refund an actionable EFW, the dispute never happens — no fee, no impact on your dispute ratio.",
  },
  {
    question: "Won't auto-refunding lose me money?",
    answer:
      "Compare the costs: a proactive refund loses you the transaction amount but saves you $15-25 in dispute fees, protects your dispute ratio, and avoids Stripe monitoring. For most SaaS, the math strongly favors auto-refunding small amounts — especially for fraud-related alerts.",
  },
  {
    question: "What safety controls are there?",
    answer:
      "You control everything. Set maximum refunds per day, per customer, and maximum refund amount. Alerts that don't match any policy go to a manual review queue. Every action is logged in a full audit trail.",
  },
  {
    question: "What size companies is Qarta for?",
    answer:
      "SaaS companies doing $200K-$3M ARR with 1,000-20,000 transactions per month on Stripe. You're big enough that chargebacks cost real money, but not so big that you've hired a dedicated risk team.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Free during early access — first 10 alerts per month included. After that, Pro plans start at $199/month + a small per-deflection fee. You only pay when we save you from chargebacks. Details coming soon.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Common questions
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-100 bg-white"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-medium text-gray-900">
                  {faq.question}
                </span>
                <span
                  className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500 transition-transform ${
                    openIndex === index ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 text-gray-500">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
