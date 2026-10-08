import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { centerConfig } from "@/lib/center-config";

export const metadata: Metadata = {
  title: `AI Front Desk · ${centerConfig.name}`,
  description: "Demo front desk for a fictional childcare center.",
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
