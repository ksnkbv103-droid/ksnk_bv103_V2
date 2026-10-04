"use client";

import Link from "next/link";
import { FlameKindling } from "lucide-react";
import { cssdQuyTrinhBatchTabHref } from "@/lib/cssd-routes";

/**
 * One primary mẻ CTA on the station strip (P2-1).
 * Opens tab Mẻ tiệt khuẩn — sterilisation handoff; not a scan target.
 * Uses toolbar-primary visual weight (solid primary), not equal dashed station cell.
 */
export default function CssdBatchMeLinkChip() {
  return (
    <Link
      href={cssdQuyTrinhBatchTabHref()}
      aria-label="Mở phiếu mẻ tiệt khuẩn"
      className="app-shell-focus bv103-control-h inline-flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] bg-[var(--primary)] px-1.5 py-1.5 text-center text-xs font-semibold text-white shadow-sm transition-colors touch-manipulation hover:bg-[var(--primary-hover)] sm:min-h-12 sm:px-2"
    >
      <FlameKindling size={14} aria-hidden className="shrink-0" />
      <span className="truncate bv103-type-label font-semibold leading-tight">Phiếu mẻ</span>
    </Link>
  );
}
