const steps = [
  {
    step: "01",
    title: "Integrate Once",
    description:
      "Replace your direct Stripe API calls with Qarta's unified API. Takes less than a day to integrate.",
  },
  {
    step: "02",
    title: "Connect Providers",
    description:
      "Link your Stripe account and optional fallback providers through our dashboard. No code changes needed.",
  },
  {
    step: "03",
    title: "Optimize Automatically",
    description:
      "Qarta routes payments, retries declines, prevents chargebacks, and maximizes revenue — all on autopilot.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Up and running in hours, not months
          </h2>
        </div>

        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-3 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
