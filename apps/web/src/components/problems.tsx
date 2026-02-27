import { type ReactNode } from "react";

const problems: {
  icon: ReactNode;
  color: string;
  bg: string;
  title: string;
  description: string;
}[] = [
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    title: "Every Chargeback Costs You Real Money",
    description:
      "Each dispute means the transaction amount + $15-25 in Stripe fees. For a $50 subscription, that's a 50%+ loss — and it adds up fast.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Stripe Flags You at 0.75%",
    description:
      "Cross the 0.75% dispute rate threshold and Stripe puts you into monitoring. Cross 0.9% and you enter the VAMP programme — risking account termination.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    title: "Chargebacks Arrive Too Late",
    description:
      "By the time you see a chargeback in your Stripe dashboard, the window to act has passed. You needed to refund proactively — hours or days earlier.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "No Visibility Into Pre-Dispute Signals",
    description:
      "Stripe sends Early Fraud Warnings before disputes happen. Most SaaS teams don't even know they exist — or how to act on them automatically.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="14" y2="13" />
        <line x1="8" y1="17" x2="11" y2="17" />
      </svg>
    ),
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    title: "Manual Triage Wastes Your Team's Time",
    description:
      "Without automation, every dispute alert requires someone to investigate, decide, and refund manually. That's hours per week on a problem that should be automated.",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "SaaS Subscription Patterns Cause Friendly Fraud",
    description:
      "Free trials that convert, forgotten subscriptions, upgrade confusion — SaaS billing patterns trigger chargebacks even from happy customers.",
  },
];

export function Problems() {
  return (
    <section id="problems" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            The Problem
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Chargebacks quietly destroy SaaS margins
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Most Stripe SaaS companies don&apos;t think about chargebacks — until
            they&apos;re in monitoring. By then, it&apos;s expensive and stressful.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg"
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${problem.bg} ${problem.color}`}
              >
                {problem.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {problem.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
