"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    // TODO: Connect to actual waitlist backend (API endpoint or third-party like Loops, Resend, etc.)
    // For now, simulate success
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStatus("success");
    setEmail("");
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800">
        You&apos;re on the list! We&apos;ll reach out soon.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      id="waitlist"
      className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "loading" ? "Joining..." : "Join Early Access"}
      </button>
    </form>
  );
}
