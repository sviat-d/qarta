export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                Q
              </div>
              <span className="font-bold text-gray-900">Qarta</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Chargeback deflection for Stripe SaaS.
              <br />
              Protect your dispute ratio. Save revenue.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>
                <a href="#solution" className="hover:text-gray-700">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-gray-700">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-gray-700">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>
                <a
                  href="mailto:hello@qarta.eu"
                  className="hover:text-gray-700"
                >
                  hello@qarta.eu
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Qarta. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
