import Link from "next/link";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

export function Header() {
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
          <a href="#problems" className="transition-colors hover:text-white">
            Why Qarta
          </a>
          <a href="#solution" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            FAQ
          </a>
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
        </div>
      </div>
    </header>
  );
}
