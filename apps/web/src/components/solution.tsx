const features = [
  {
    title: "Higher Approval Rates",
    description:
      "Smart retry logic for soft declines, optimal timing, and fallback routing increase your successful charges by up to 15%.",
    metric: "+15%",
    metricLabel: "approval rate",
  },
  {
    title: "Chargeback Protection",
    description:
      "Early fraud detection, automated dispute responses, and proactive alerts keep you below Stripe's monitoring thresholds.",
    metric: "-70%",
    metricLabel: "chargebacks",
  },
  {
    title: "Multi-PSP Fallback",
    description:
      "Route payments across Stripe and alternative providers. If one declines, another picks up — zero downtime, zero lost revenue.",
    metric: "99.9%",
    metricLabel: "uptime",
  },
  {
    title: "Crypto Rails",
    description:
      "Accept USDT, USDC, and other stablecoins alongside traditional cards. Same API, same dashboard, new revenue streams.",
    metric: "USDT",
    metricLabel: "& more",
  },
];

export function Solution() {
  return (
    <section id="solution" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            One integration. Full payment optimization.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Qarta sits between your app and payment providers, optimizing every
            transaction automatically.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 p-8 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-brand-600">
                  {feature.metric}
                </span>
                <span className="text-sm text-gray-500">
                  {feature.metricLabel}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-3 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
