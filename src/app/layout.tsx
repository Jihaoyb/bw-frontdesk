import type { Metadata, Viewport } from "next";
import "./globals.css";
import { centerConfig } from "@/lib/center-config";

export const metadata: Metadata = {
  title: `AI Front Desk · ${centerConfig.name}`,
  description: "Demo front desk for a fictional childcare center.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
