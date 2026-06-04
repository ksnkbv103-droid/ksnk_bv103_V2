"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cssdTraceUrlFromMaQr } from "@/lib/cssd-nkbv-trace";

type Props = {
  maQr?: string | null;
  tenBo?: string | null;
  className?: string;
};

/** Deep link sang truy vết QR CSSD (tab trace). */
export default function CssdTraceLink({ maQr, tenBo, className = "" }: Props) {
  const code = String(maQr || "").trim().toUpperCase();
  if (!code) return null;

  return (
    <Link
      href={cssdTraceUrlFromMaQr(code)}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 ${className}`}
      prefetch
    >
      <ExternalLink size={14} aria-hidden />
      Truy vết CSSD{tenBo ? `: ${tenBo}` : `: ${code}`}
    </Link>
  );
}
