"use client";

import Link from "next/link";
import { BarChart2, ChevronLeft } from "lucide-react";
import { GSC_ROUTE_CHROME, type GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

/** Clarifies dual analytics entry: per-loai route vs canonical `/thong-ke/gsc`. */
export default function GscAnalyticsScopeBanner({ loai }: { loai: GscLoaiGiamSatRoute }) {
  const chrome = GSC_ROUTE_CHROME[loai];
  const scopeLabel = `${chrome.titlePlain}${chrome.titleAccent}`.trim();

  return (
    <nav
      aria-label="Phạm vi thống kê GSC"
      className={`no-print ${C.panelInset} border-sky-100 bg-sky-50/80 px-3 py-2 text-sm text-sky-950 sm:px-4 sm:py-3`}
    >
      <MobileCollapsibleNotice
        className="border-0 bg-transparent p-0"
        dismissible={false}
        summary={
          <span>
            <span className="text-sky-700">Chuyên đề:</span> <strong>{scopeLabel}</strong>
          </span>
        }
        detail="Chỉ thống kê phiên thuộc loại giám sát này."
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 max-sm:gap-1.5">
        <Link
          href="/thong-ke/gsc"
          className={`inline-flex items-center gap-1.5 ${C.btnSecondary} h-auto min-h-9 border-sky-200 px-2.5 py-1.5 text-xs text-sky-800 hover:bg-sky-50 sm:min-h-0 sm:px-3 sm:text-sm`}
        >
          <BarChart2 className="h-3.5 w-3.5" aria-hidden />
          <span className="max-sm:hidden">Tổng hợp mọi chuyên đề</span>
          <span className="sm:hidden">Tổng hợp</span>
        </Link>
        <Link
          href={chrome.href}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-700 hover:underline touch-manipulation sm:min-h-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Form
        </Link>
      </div>
    </nav>
  );
}
