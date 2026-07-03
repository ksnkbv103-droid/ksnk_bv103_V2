"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export default function CssdCatalogMdmBanner(props: { className?: string; focusTab?: "loai" | "bo" | "chi-tiet" }) {
  const focus = props.focusTab ?? "bo";
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 ${props.className ?? ""}`}
    >
      <div className="space-y-1">
        <p>
          <span className="font-semibold text-slate-900">Chế độ xem vận hành.</span> Thêm/sửa master data chỉ tại
          Quản trị — mã bộ tem QR là <span className="font-mono font-bold">ma_bo</span> (B01.SET.01), không phải mã chi
          tiết DC-*.
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">
          <Link href={quanTriDungCuHref("loai")} className="underline hover:text-emerald-800">
            Loại
          </Link>
          <Link href={quanTriDungCuHref("bo")} className="underline hover:text-emerald-800">
            Bộ
          </Link>
          <Link href={quanTriDungCuHref("chi-tiet")} className="underline hover:text-emerald-800">
            Thành phần
          </Link>
        </p>
      </div>
      <Link
        href={quanTriDungCuHref(focus)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-white px-3 py-2 font-mono text-[11px] font-medium text-[var(--primary)] hover:bg-emerald-50"
      >
        {focus === "loai" ? "Quản trị loại dụng cụ" : focus === "chi-tiet" ? "Quản trị thành phần bộ" : "Quản trị bộ dụng cụ"}
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
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#025214]"
      >
        Quản trị thiết bị
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}