"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

export default function CssdCatalogMdmBanner(props: { className?: string; focusTab?: "loai" | "bo" | "chi-tiet" }) {
  const focus = props.focusTab ?? "bo";
  const adminLabel =
    focus === "loai" ? "Quản trị loại" : focus === "chi-tiet" ? "Quản trị thành phần" : "Quản trị bộ";

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:px-4 sm:py-3 ${props.className ?? ""}`}
    >
      <MobileCollapsibleNotice
        className="border-0 bg-transparent p-0"
        dismissible={false}
        summary={
          <span>
            <span className="font-semibold text-slate-900">Chế độ xem vận hành.</span> Sửa{" "}
            <span className="font-semibold">danh mục dụng cụ (Master CSSD)</span> tại Quản trị — không phải khoa/nhân sự.
          </span>
        }
        detail={
          <>
            Mã bộ tem QR là <span className="font-mono font-bold">ma_bo</span> (B01.SET.01), không phải mã chi tiết DC-*.
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">
              <Link href={quanTriDungCuHref("loai")} className="underline hover:text-emerald-800">
                Loại
              </Link>
              <Link href={quanTriDungCuHref("bo")} className="underline hover:text-emerald-800">
                Bộ
              </Link>
              <Link href={quanTriDungCuHref("chi-tiet")} className="underline hover:text-emerald-800">
                Thành phần
              </Link>
            </span>
          </>
        }
      />
      <Link
        href={quanTriDungCuHref(focus)}
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-[var(--primary)] hover:bg-emerald-50 sm:mt-0 sm:px-3 sm:py-2"
      >
        <span className="sm:hidden">{adminLabel}</span>
        <span className="hidden sm:inline">
          {focus === "loai"
            ? "Quản trị danh mục — loại dụng cụ"
            : focus === "chi-tiet"
              ? "Quản trị danh mục — thành phần bộ"
              : "Quản trị danh mục — bộ dụng cụ"}
        </span>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
