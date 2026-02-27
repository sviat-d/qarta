import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Qarta — Chargeback Deflection for Stripe SaaS",
  description:
    "Stop chargebacks before they happen. Auto-refund pre-dispute alerts, protect your Stripe dispute ratio, and save revenue — on autopilot.",
  keywords: [
    "chargeback prevention",
    "chargeback deflection",
    "Stripe chargebacks",
    "dispute prevention",
    "Stripe dispute rate",
    "SaaS chargeback",
    "early fraud warning",
    "auto refund",
    "Stripe monitoring",
    "VAMP protection",
  ],
  openGraph: {
    title: "Qarta — Chargeback Deflection for Stripe SaaS",
    description:
      "Stop chargebacks before they happen. Protect your Stripe dispute ratio automatically.",
    url: "https://qarta.eu",
    siteName: "Qarta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qarta — Chargeback Deflection for Stripe SaaS",
    description:
      "Stop chargebacks before they happen. Protect your Stripe dispute ratio automatically.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
