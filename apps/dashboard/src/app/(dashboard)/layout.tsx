"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="pt-14 lg:ml-64 lg:pt-0">
        {isDemo && (
          <div className="flex items-center justify-between border-b border-brand-200 bg-brand-50 px-8 py-2.5">
            <p className="text-sm text-brand-800">
              You&apos;re in demo mode. Data shown is simulated.
              Sign up to connect your real Stripe account.
            </p>
            <Link
              href="/signup"
              className="whitespace-nowrap rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              Sign Up
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
