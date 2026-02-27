const problems = [
  {
    icon: "$$",
    title: "Every Chargeback Costs You Real Money",
    description:
      "Each dispute means the transaction amount + $15-25 in Stripe fees. For a $50 subscription, that's a 50%+ loss — and it adds up fast.",
  },
  {
    icon: "!!",
    title: "Stripe Flags You at 0.75%",
    description:
      "Cross the 0.75% dispute rate threshold and Stripe puts you into monitoring. Cross 0.9% and you enter the VAMP programme — risking account termination.",
  },
  {
    icon: ">>",
    title: "Chargebacks Arrive Too Late",
    description:
      "By the time you see a chargeback in your Stripe dashboard, the window to act has passed. You needed to refund proactively — hours or days earlier.",
  },
  {
    icon: "??",
    title: "No Visibility Into Pre-Dispute Signals",
    description:
      "Stripe sends Early Fraud Warnings before disputes happen. Most SaaS teams don't even know they exist — or how to act on them automatically.",
  },
  {
    icon: "//",
    title: "Manual Triage Wastes Your Team's Time",
    description:
      "Without automation, every dispute alert requires someone to investigate, decide, and refund manually. That's hours per week on a problem that should be automated.",
  },
  {
    icon: "<>",
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
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 font-mono text-sm font-bold text-red-500">
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
