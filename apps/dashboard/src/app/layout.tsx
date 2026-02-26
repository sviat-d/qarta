import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qarta Dashboard",
  description: "Manage your payments, track revenue, and optimize approval rates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
