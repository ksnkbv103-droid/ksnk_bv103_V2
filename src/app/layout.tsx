// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const ClientLayoutWrapper = dynamic(() => import("../components/shared/ClientLayoutWrapper"), {
  ssr: true,
});

import { PermissionProvider } from "@/contexts/PermissionProvider";
import { getServerRbacSnapshot } from "@/lib/auth/rbac-request";

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

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
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialRbac = await getServerRbacSnapshot();
  return (
    <html lang="vi" className={`${inter.className} ${inter.variable}`}>
      <body className="bg-slate-50 text-slate-900 pointer-events-auto">
        <PermissionProvider initialSnapshot={initialRbac}>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </PermissionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}