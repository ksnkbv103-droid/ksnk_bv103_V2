"use client";

import Link from "next/link";
import { BarChart2, ChevronLeft } from "lucide-react";
import { GSC_ROUTE_CHROME, type GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

/** Clarifies dual analytics entry: per-loai route vs canonical `/thong-ke/gsc`. */
export default function GscAnalyticsScopeBanner({ loai }: { loai: GscLoaiGiamSatRoute }) {
  const chrome = GSC_ROUTE_CHROME[loai];
  const scopeLabel = `${chrome.titlePlain}${chrome.titleAccent}`.trim();

  return (
    <nav aria-label="Phạm vi thống kê GSC" className="no-print space-y-2">
      <KsnkContextBanner
        tone="sky"
        dismissible={false}
        summary={
          <span>
            <span className="text-sky-700">Chuyên đề:</span> <strong>{scopeLabel}</strong>
          </span>
        }
        detail="Chỉ thống kê phiên thuộc loại giám sát này."
      />
      <div className="flex flex-wrap items-center gap-2 px-0.5 max-sm:gap-1.5">
        <Link
          href="/thong-ke/gsc"
          className={`inline-flex items-center gap-1.5 ${C.btnSecondary} h-auto min-h-9 border-sky-200 px-2.5 py-1.5 text-xs text-sky-800 hover:bg-sky-50 sm:min-h-0 sm:px-3 sm:text-sm`}
        >
          <BarChart2 className="h-3.5 w-3.5" aria-hidden />
          <span className="max-sm:hidden">Về thống kê tuân thủ (mặc định)</span>
          <span className="sm:hidden">Tuân thủ</span>
        </Link>
        <Link
          href={chrome.href}
          className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-control)] px-2 py-1.5 text-xs font-semibold text-sky-700 hover:underline touch-manipulation sm:min-h-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Form
        </Link>
      </div>
    </nav>
  );
}
