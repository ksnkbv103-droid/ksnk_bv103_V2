"use client";

import Link from "next/link";
import { BarChart2, ChevronLeft } from "lucide-react";
import { GSC_ROUTE_CHROME, type GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

/** Clarifies dual analytics entry: per-loai route vs canonical `/thong-ke/gsc`. */
export default function GscAnalyticsScopeBanner({ loai }: { loai: GscLoaiGiamSatRoute }) {
  const chrome = GSC_ROUTE_CHROME[loai];
  const scopeLabel = `${chrome.titlePlain}${chrome.titleAccent}`.trim();

  return (
    <nav
      aria-label="Phạm vi thống kê GSC"
      className={`no-print ${C.panelInset} flex flex-col gap-3 border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between`}
    >
      <p>
        <span className="text-sky-700">Đang lọc theo chuyên đề:</span>{" "}
        <strong>{scopeLabel}</strong>
        <span className="mt-0.5 block text-xs text-sky-800/80 sm:mt-0 sm:inline sm:before:content-['_·_']">
          Chỉ thống kê phiên thuộc loại giám sát này.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/thong-ke/gsc"
          className={`inline-flex items-center gap-1.5 ${C.btnSecondary} h-auto min-h-0 border-sky-200 px-3 py-1.5 text-sky-800 hover:bg-sky-50`}
        >
          <BarChart2 className="h-3.5 w-3.5" aria-hidden />
          Tổng hợp mọi chuyên đề
        </Link>
        <Link
          href={chrome.href}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-700 hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Form nhập liệu
        </Link>
      </div>
    </nav>
  );
}
