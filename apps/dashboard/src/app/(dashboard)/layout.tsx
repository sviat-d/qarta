"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen">
          <Sidebar />
          <main className="ml-64">{children}</main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
