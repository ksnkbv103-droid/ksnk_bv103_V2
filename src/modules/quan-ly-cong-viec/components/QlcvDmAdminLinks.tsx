"use client";

import Link from "next/link";
import { ExternalLink, Settings2 } from "lucide-react";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";

/** Liên kết MDM loại/trạng thái công việc (Quản trị). */
export function QlcvDmAdminLinks({ className }: { className?: string }) {
  const loaiHref = getDanhMucAdminPath("LOAI_CONG_VIEC");
  const trangThaiHref = getDanhMucAdminPath("TRANG_THAI_CONG_VIEC");

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600 ${className ?? ""}`}
    >
      <Settings2 size={14} className="shrink-0 text-slate-500" aria-hidden />
      <span className="font-medium text-slate-700">Danh mục QLCV:</span>
      <Link
        href={loaiHref}
        className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
      >
        Loại công việc <ExternalLink size={11} aria-hidden />
      </Link>
      <span className="text-slate-300">·</span>
      <Link
        href={trangThaiHref}
        className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
      >
        Trạng thái <ExternalLink size={11} aria-hidden />
      </Link>
    </div>
  );
}
