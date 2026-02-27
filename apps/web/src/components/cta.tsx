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
            Connect your Stripe account in 10 minutes. Start deflecting
            chargebacks automatically.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a
              href={`${DASHBOARD_URL}/login`}
              className="inline-flex rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/25"
            >
              Start Free — No Credit Card
            </a>
            <p className="text-sm text-slate-600">
              First 10 alerts/month free. No code changes needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
