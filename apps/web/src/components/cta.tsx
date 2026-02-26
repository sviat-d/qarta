import { WaitlistForm } from "./waitlist-form";

export function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl rounded-2xl bg-brand-600 px-8 py-16 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop losing revenue to failed payments
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
          Join the early access list. Be the first to optimize your SaaS
          payments with Qarta.
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
