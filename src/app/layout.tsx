import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alert Triage | Security Operations",
  description: "A focused security alert triage workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
