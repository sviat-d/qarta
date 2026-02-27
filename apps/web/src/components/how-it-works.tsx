const steps = [
  {
    step: "01",
    title: "Connect Stripe",
    description:
      "Install the Qarta Stripe app or connect via OAuth. We sync your charges, disputes, and Early Fraud Warnings. Takes 10 minutes, no code changes.",
  },
  {
    step: "02",
    title: "Set Your Policies",
    description:
      "Define auto-refund rules: amount thresholds, dispute reasons, safety caps per day. Start with our recommended defaults or customize completely.",
  },
  {
    step: "03",
    title: "Chargebacks Drop",
    description:
      "Qarta intercepts pre-dispute signals 24/7, auto-refunds according to your policies, and shows you exactly how much you saved. Dispute ratio stays safe.",
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
            Live in 10 minutes. No code changes.
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
