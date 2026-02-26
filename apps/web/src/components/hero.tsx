import { WaitlistForm } from "./waitlist-form";

const metrics = [
  { value: "+15%", label: "Approval Rate" },
  { value: "-70%", label: "Chargebacks" },
  { value: "<1 day", label: "Integration" },
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
          Payment optimization layer for SaaS
        </div>

        <h1 className="animate-fade-in-up-delay-1 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Your payments work.
          <br />
          <span className="text-gradient">Make them work better.</span>
        </h1>

        <p className="animate-fade-in-up-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Stripe handles 80% of your payments perfectly. Qarta optimizes the other
          20% — failed charges, chargebacks, and single-provider risk that quietly
          cost you thousands every month.
        </p>

        <div className="animate-fade-in-up-delay-3 mt-10" id="waitlist">
          <WaitlistForm variant="dark" />
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
