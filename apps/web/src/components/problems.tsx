const problems = [
  {
    title: "Declined Payments",
    description:
      "Soft declines, card failures, and processing errors silently kill your revenue. Up to 15% of recurring charges fail.",
    icon: "XCircle",
  },
  {
    title: "Chargebacks & Disputes",
    description:
      "Every chargeback costs you the transaction + fees + reputation. Cross the 0.75% threshold and Stripe puts you on monitoring.",
    icon: "AlertTriangle",
  },
  {
    title: "Stripe Account Risk",
    description:
      "High dispute rates, fraud flags, or suspicious patterns can get your account frozen — losing access to your payment flow overnight.",
    icon: "ShieldOff",
  },
  {
    title: "No Fallback",
    description:
      "Single PSP means single point of failure. When Stripe goes down or declines a charge, you have zero alternatives.",
    icon: "Unplug",
  },
  {
    title: "Recurring Failures",
    description:
      "Failed subscription renewals lead to involuntary churn. Most SaaS companies don't optimize retry timing or strategy.",
    icon: "RefreshCcw",
  },
  {
    title: "International Complexity",
    description:
      "Cross-border cards, local payment methods, currency conversion — international expansion multiplies payment complexity.",
    icon: "Globe",
  },
];

export function Problems() {
  return (
    <section id="problems" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            SaaS payments are harder than they look
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Stripe handles 80% of payments perfectly. Qarta optimizes the other
            20% — where you&apos;re quietly losing revenue.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <span className="text-lg font-bold">!</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {problem.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
