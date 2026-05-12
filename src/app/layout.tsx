// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayoutWrapper from "../components/shared/ClientLayoutWrapper";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KSNK 103 - Bệnh viện Quân y 103",
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
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}