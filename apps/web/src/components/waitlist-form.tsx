"use client";

import { useState } from "react";

interface WaitlistFormProps {
  variant?: "light" | "dark";
}

export function WaitlistForm({ variant = "light" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    // TODO: Connect to actual waitlist backend (API endpoint or third-party like Loops, Resend, etc.)
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStatus("success");
    setEmail("");
  }

  const isDark = variant === "dark";

  if (status === "success") {
    return (
      <div
        className={`mx-auto max-w-md rounded-lg border p-4 text-center ${
          isDark
            ? "border-green-500/20 bg-green-500/10 text-green-300"
            : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        You&apos;re on the list! We&apos;ll reach out soon.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          isDark
            ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
            : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
        }`}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/25 disabled:opacity-50"
      >
        {status === "loading" ? "Joining..." : "Get Early Access"}
      </button>
    </form>
  );
}
