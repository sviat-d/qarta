import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Qarta — Smarter Payments for SaaS",
  description:
    "Increase approval rates, reduce chargebacks, and protect your Stripe account. One API. One integration. More revenue. Less risk.",
  keywords: [
    "SaaS payments",
    "payment optimization",
    "chargeback protection",
    "approval rate",
    "Stripe optimization",
    "payment orchestration",
    "recurring billing",
    "crypto payments",
  ],
  openGraph: {
    title: "Qarta — Smarter Payments for SaaS",
    description:
      "Increase approval rates, reduce chargebacks, and protect your Stripe account.",
    url: "https://qarta.eu",
    siteName: "Qarta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qarta — Smarter Payments for SaaS",
    description:
      "Increase approval rates, reduce chargebacks, and protect your Stripe account.",
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
