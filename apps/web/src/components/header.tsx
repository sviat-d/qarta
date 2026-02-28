"use client";

import { useState } from "react";
import Link from "next/link";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

const navLinks = [
  { href: "#problems", label: "Why Qarta" },
  { href: "#solution", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            Q
          </div>
          <span className="text-lg font-bold text-white">Qarta</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`${DASHBOARD_URL}/login`}
            className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:inline-block"
          >
            Sign In
          </a>
          <a
            href={`${DASHBOARD_URL}/login`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/25"
          >
            Try Demo
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="border-t border-white/10 bg-slate-950/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-white/10 pt-3">
              <a
                href={`${DASHBOARD_URL}/login`}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Sign In
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
