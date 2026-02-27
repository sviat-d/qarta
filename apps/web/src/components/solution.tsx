const features = [
  {
    metric: "-70%",
    metricLabel: "dispute rate",
    title: "Pre-Dispute Alert Interception",
    description:
      "Qarta listens to Stripe Early Fraud Warnings and dispute events in real time. When a signal arrives, we act before it becomes a recorded chargeback on your account.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    metric: "Auto",
    metricLabel: "refund policies",
    title: "Rule-Based Auto-Refund Engine",
    description:
      "Set your rules: auto-refund if amount < $100 and reason is fraud. Set safety caps per day and per customer. Qarta executes refunds via Stripe Refunds API — no manual work.",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    metric: "0.3%",
    metricLabel: "safe dispute rate",
    title: "Dispute Ratio Protection",
    description:
      "Stay well below Stripe's 0.75% monitoring threshold. Qarta tracks your dispute ratio trend and shows exactly how many chargebacks were prevented and fees saved.",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    metric: "24/7",
    metricLabel: "on autopilot",
    title: "Outcomes Dashboard",
    description:
      "See what matters: disputes avoided, fees saved, dispute ratio trend, automation rate. No noise — just clear proof of revenue protected. Export for your CFO.",
    gradient: "from-emerald-500 to-teal-600",
  },
];

export function Solution() {
  return (
    <section id="solution" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            The Solution
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Chargeback deflection on autopilot
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Connect Stripe. Set your policies. Qarta handles the rest — intercepting
            pre-dispute signals and auto-refunding before chargebacks hit your account.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 transition-all hover:shadow-lg"
            >
              <div className="mb-4 flex items-baseline gap-3">
                <span
                  className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-4xl font-bold text-transparent`}
                >
                  {feature.metric}
                </span>
                <span className="text-sm text-gray-400">
                  {feature.metricLabel}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-500">
                {feature.description}
              </p>
              <div
                className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-5 transition-opacity group-hover:opacity-10`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
