import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Qarta
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          <a href="#problems" className="transition-colors hover:text-gray-900">
            Problems
          </a>
          <a href="#solution" className="transition-colors hover:text-gray-900">
            Solution
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-gray-900"
          >
            How It Works
          </a>
        </nav>

        <a
          href="#waitlist"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
}
