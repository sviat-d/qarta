import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "../fonts/Poppins-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Poppins-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Poppins-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
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
    <html lang="en" className={poppins.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
