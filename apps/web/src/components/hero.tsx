const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

const metrics = [
  { value: "-70%", label: "Dispute Rate" },
  { value: "$15+", label: "Saved Per Alert" },
  { value: "10 min", label: "Setup Time" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 pb-24 pt-32 sm:pb-32 sm:pt-40">
      {/* Background grid pattern */}
      <div className="bg-grid pointer-events-none absolute inset-0" />
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-[600px] w-[900px] rounded-full bg-brand-600/10 blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0">
        <div className="h-[300px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Chargeback deflection for Stripe SaaS
        </div>

        <h1 className="animate-fade-in-up-delay-1 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Stop chargebacks
          <br />
          <span className="text-gradient">before they happen.</span>
        </h1>

        <p className="animate-fade-in-up-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Qarta intercepts pre-dispute signals from Stripe, auto-refunds based
          on your rules, and keeps your dispute ratio safe — so you never wake
          up to a frozen Stripe account.
        </p>

        <div className="animate-fade-in-up-delay-3 mt-10 flex flex-col items-center gap-4">
          <a
            href={`${DASHBOARD_URL}/login`}
            className="inline-flex rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/25"
          >
            Start Free — No Credit Card
          </a>
          <p className="text-sm text-slate-500">
            10 min setup. First 10 alerts/month free.
          </p>
        </div>

        <div className="animate-fade-in-up-delay-3 mt-12 flex flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-8 sm:gap-12">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {metric.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
