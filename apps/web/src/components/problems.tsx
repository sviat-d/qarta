const problems = [
  {
    icon: "💸",
    title: "Failed Payments",
    description:
      "Up to 15% of recurring charges fail due to soft declines, expired cards, and processing errors. That's revenue you already earned — gone.",
  },
  {
    icon: "⚠️",
    title: "Chargebacks Eat Your Margins",
    description:
      "Every chargeback costs the transaction amount + $15–25 in fees. Cross 0.75% dispute rate and Stripe flags your account for monitoring.",
  },
  {
    icon: "🔒",
    title: "Stripe Account Freeze Risk",
    description:
      "High dispute rates or fraud signals can freeze your Stripe account overnight — cutting off your entire payment flow with no warning.",
  },
  {
    icon: "🔌",
    title: "Single Provider = Single Point of Failure",
    description:
      "When your only PSP declines a payment or has an outage, you have zero alternatives. The customer just sees 'payment failed'.",
  },
  {
    icon: "🔄",
    title: "Subscription Churn from Failed Renewals",
    description:
      "Involuntary churn from failed renewals accounts for 20–40% of total churn in SaaS. Most companies don't optimize retry logic at all.",
  },
  {
    icon: "🌍",
    title: "International Payment Complexity",
    description:
      "Cross-border cards, local payment methods, multi-currency — expanding internationally multiplies payment failure rates.",
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
            SaaS payments are harder than they look
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Stripe handles the happy path. But the edge cases — declines,
            chargebacks, outages — are where you quietly lose thousands every month.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg"
            >
              <div className="mb-4 text-2xl">{problem.icon}</div>
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
