const features = [
  {
    metric: "+15%",
    metricLabel: "approval rate",
    title: "Smart Payment Routing",
    description:
      "Automatic retry logic for soft declines with optimal timing. If one provider declines, Qarta routes to the next — before the customer even notices.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    metric: "-70%",
    metricLabel: "chargebacks",
    title: "Chargeback Prevention",
    description:
      "Real-time fraud signals, automated dispute responses, and proactive alerts. Stay well below Stripe's monitoring threshold.",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    metric: "99.9%",
    metricLabel: "uptime",
    title: "Multi-PSP Fallback",
    description:
      "Stripe goes down? Charges still process through alternative providers. No single point of failure, no lost revenue during outages.",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    metric: "USDT/C",
    metricLabel: "stablecoins",
    title: "Crypto Payment Rails",
    description:
      "Accept USDT, USDC, and other stablecoins alongside traditional cards. Same API, same dashboard — new revenue stream for international customers.",
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
            One integration. Full payment optimization.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Qarta sits between your app and payment providers, optimizing every
            transaction automatically. You keep using Stripe — we make it better.
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
