"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

const MDM_DUNG_CU_HREF = "/quan-tri-he-thong/danh-muc/dung-cu";

export default function CssdCatalogMdmBanner(props: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 ${props.className ?? ""}`}
    >
      <p>
        <span className="font-semibold text-slate-900">Chế độ xem vận hành.</span> Thêm/sửa loại, bộ, chi tiết danh mục
        tại Quản trị hệ thống.
      </p>
      <Link
        href={MDM_DUNG_CU_HREF}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#026f17]/30 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#026f17] hover:bg-emerald-50"
      >
        Mở quản trị dụng cụ
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export function CssdThietBiMdmBanner() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">
        Danh mục máy tiệt khuẩn / rửa (CRUD) nằm tại Quản trị — CSSD chỉ vận hành bảo dưỡng và chọn máy cho mẻ.
      </p>
      <Link
        href="/quan-tri-he-thong/danh-muc/thiet-bi"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#026f17] px-5 py-3 text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#025214]"
      >
        Quản trị thiết bị
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
