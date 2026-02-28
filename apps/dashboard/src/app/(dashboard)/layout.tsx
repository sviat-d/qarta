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
    <div className="min-h-screen bg-[#f8f9fb]">
      <Sidebar />
      <main className="ml-[260px]">
        {isDemo && (
          <div className="flex items-center justify-between border-b border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-3">
            <p className="text-[13px] font-medium text-amber-800">
              You&apos;re viewing demo data. Connect your Stripe account to start preventing chargebacks.
            </p>
            <Link
              href="/settings"
              className="whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:from-amber-600 hover:to-amber-700"
            >
              Connect Stripe
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
