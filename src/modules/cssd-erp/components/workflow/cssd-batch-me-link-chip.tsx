"use client";

import Link from "next/link";
import { FlameKindling } from "lucide-react";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

/**
 * Ô phiếu mẻ — mở tab Mẻ tiệt khuẩn (không quét tại trang chu trình).
 * Cùng khung với ô chọn trạm.
 */
export default function CssdBatchMeLinkChip() {
  return (
    <Link
      href={`${CSSD_ROUTES.quyTrinh}?tab=batch`}
      aria-label="Mở tab phiếu mẻ tiệt khuẩn"
      className="app-shell-focus group relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 px-2 py-1.5 text-center transition-colors touch-manipulation hover:border-amber-500 hover:bg-amber-50 sm:h-16 sm:px-2.5"
    >
      <span className="shrink-0 text-amber-600">
        <FlameKindling size={16} aria-hidden />
      </span>
      <span className="truncate text-[11px] font-bold leading-tight text-amber-900">Phiếu mẻ</span>
    </Link>
  );
}
