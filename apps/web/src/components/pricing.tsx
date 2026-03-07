const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started and see the value before you pay.",
    features: [
      "10 alerts / month",
      "Auto-refund policies",
      "Outcomes dashboard",
      "Email notifications",
      "1 team member",
    ],
    cta: "Get Started Free",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    popular: false,
  },
  {
    name: "Pro",
    price: "$199",
    period: "/ month",
    description: "For growing SaaS with real chargeback exposure.",
    features: [
      "Unlimited alerts",
      "Advanced policy engine",
      "Slack + email notifications",
      "Priority support",
      "5 team members",
      "$15 per deflected chargeback",
    ],
    cta: "Start Pro",
    ctaStyle: "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25",
    popular: true,
  },
  {
    name: "Growth",
    price: "$399",
    period: "/ month",
    description: "For high-volume businesses with 50+ deflections/month.",
    features: [
      "Everything in Pro",
      "Volume discounts on deflections",
      "Custom policy rules",
      "API access",
      "Unlimited team members",
      "Dedicated account manager",
    ],
    cta: "Start Growth",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
            Start free. Pay only when Qarta is saving you money.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                plan.popular
                  ? "border-brand-600 ring-1 ring-brand-600/20 shadow-xl"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-gray-500">{plan.description}</p>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`${DASHBOARD_URL}/signup`}
                className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${plan.ctaStyle}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          All plans include Stripe-only integration, auto-refund engine, and audit logging.
          No setup fees. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
