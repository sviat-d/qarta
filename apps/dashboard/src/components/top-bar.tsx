"use client";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200/80 bg-white px-8">
      <h1 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          All systems operational
        </span>
      </div>
    </header>
  );
}
