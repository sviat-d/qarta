"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Do I need to stop using Stripe?",
    answer:
      "No. Qarta works on top of Stripe, not instead of it. You keep your Stripe account, your dashboard, your existing setup. Qarta adds a smart routing layer that optimizes what Stripe alone can't — retry logic, fallback providers, and chargeback prevention.",
  },
  {
    question: "How long does integration take?",
    answer:
      "Less than a day for most SaaS apps. You replace your direct Stripe API calls with Qarta's unified API. Same payment flow, same customer experience. We provide SDKs, docs, and hands-on support during setup.",
  },
  {
    question: "What payment methods do you support?",
    answer:
      "Cards via Stripe (Visa, Mastercard, Amex) and stablecoins (USDT, USDC) via Coinbase Commerce. We're adding more providers and local payment methods — the whole point is one API for all of them.",
  },
  {
    question: "How do crypto payments work for my SaaS?",
    answer:
      "Your customer chooses to pay with USDT or USDC at checkout. Coinbase Commerce handles the crypto transaction. You receive the funds just like any other payment. Same API, same dashboard — no crypto complexity on your side.",
  },
  {
    question: "What size companies is Qarta for?",
    answer:
      "SaaS companies doing $300K–$5M ARR with 2,000–50,000 transactions per month. You're big enough that failed payments and chargebacks cost real money, but not so big that you've built an in-house payments team.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Free during early access. After that, we charge a small percentage on recovered revenue — money you would have lost without Qarta. You only pay when we deliver results. Pricing details coming soon.",
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
