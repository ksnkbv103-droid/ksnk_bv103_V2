"use client";

import Link from "next/link";
import { FlameKindling } from "lucide-react";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

/**
 * Ô không phải trạm quét: dẫn tới phiếu/mẻ tiệt khuẩn — bắt buộc có phiếu rồi mới quét bộ vào mẻ.
 */
export default function CssdBatchMeLinkChip() {
  return (
    <Link
      href={`${CSSD_ROUTES.quyTrinh}?tab=batch`}
      className="app-shell-focus group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-white p-3 text-center shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-50"
    >
      <div className="text-amber-600 transition-all group-hover:scale-105">
        <FlameKindling size={20} aria-hidden />
      </div>
      <div className="space-y-0.5">
        <span className="block text-[10px] font-black uppercase leading-tight tracking-tight text-amber-900">
          Phiếu mẻ
        </span>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800/80">Tạo phiếu & quét tại đây</span>
      </div>
    </Link>
  );
}
