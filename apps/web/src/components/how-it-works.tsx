const steps = [
  {
    step: "01",
    title: "Integrate Once",
    description:
      "Replace your direct Stripe API calls with Qarta's unified API. Same payment flow, same UX — just a different endpoint. Takes less than a day.",
  },
  {
    step: "02",
    title: "Connect Providers",
    description:
      "Link your Stripe account and optional fallback providers (Coinbase Commerce, more coming). Configure routing rules in the dashboard — no code changes.",
  },
  {
    step: "03",
    title: "Revenue Goes Up",
    description:
      "Qarta automatically routes payments, retries declines with smart timing, prevents chargebacks, and falls back between providers. All on autopilot.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Up and running in hours, not months
          </h2>
        </div>

        <div className="relative mt-16">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-6 hidden h-0.5 w-[60%] -translate-x-1/2 bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 sm:block" />

          <div className="grid gap-12 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/25">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
