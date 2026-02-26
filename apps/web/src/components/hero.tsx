import { WaitlistForm } from "./waitlist-form";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm text-brand-700">
          Payments & Chargeback Protection for SaaS
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Smarter Payments
          <br />
          <span className="text-brand-600">for SaaS</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Increase approval rates, reduce chargebacks, and protect your Stripe
          account. One API. One integration. More revenue. Less risk.
        </p>

        <div className="mt-10">
          <WaitlistForm />
        </div>

        <div className="mt-8 flex items-center justify-center gap-x-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            One API integration
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Multi-PSP support
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Crypto-ready
          </div>
        </div>
      </div>
    </section>
  );
}
