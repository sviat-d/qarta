import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
