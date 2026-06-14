// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const ClientLayoutWrapper = dynamic(() => import("../components/shared/ClientLayoutWrapper"), {
  ssr: true,
});

import OfflineSyncManager from "@/components/shared/OfflineSyncManager";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KSNK 103 — Bệnh viện Quân y 103",
    template: "%s | KSNK 103",
  },
  applicationName: "KSNK 103",
  description: "Hệ thống Kiểm soát nhiễm khuẩn — Bệnh viện Quân y 103",
  icons: {
    icon: [{ url: "/brand/logo-bv103.png", type: "image/png" }],
    apple: [{ url: "/brand/logo-bv103.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "KSNK 103",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.className}>
      <body className="bg-slate-50 text-slate-900 touch-manipulation pointer-events-auto">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        <OfflineSyncManager />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}