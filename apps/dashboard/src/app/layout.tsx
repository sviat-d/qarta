import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth-context";
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
  title: "Qarta Dashboard",
  description:
    "Manage your chargeback deflection policies, monitor alerts, and track dispute prevention outcomes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
