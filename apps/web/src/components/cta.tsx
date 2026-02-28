const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

export function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="bg-grid relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-950 px-8 py-20 text-center">
        {/* Gradient accent */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[200px] w-[600px] rounded-full bg-brand-600/20 blur-[80px]" />
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stop losing revenue to chargebacks
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Protect your Stripe dispute ratio and save money on every
            prevented chargeback. Set up in 10 minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={`${DASHBOARD_URL}/login`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/25"
            >
              Get Started Free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href={`${DASHBOARD_URL}/login`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Try Live Demo
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Free plan available. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
