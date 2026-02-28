import { WaitlistForm } from "./waitlist-form";

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
            Join the early access list. Protect your Stripe dispute ratio
            and save money on every prevented chargeback.
          </p>
          <div className="mt-8">
            <WaitlistForm variant="dark" />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Free during early access. 10 min setup. No code changes.
            {" "}
            <a
              href={`${DASHBOARD_URL}/login`}
              className="font-medium text-brand-400 underline decoration-brand-400/30 underline-offset-4 transition-colors hover:text-brand-300"
            >
              Try the demo
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
