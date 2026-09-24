"use client";

import { useSearchParams } from "next/navigation";
import SuCoReportForm from "@/modules/cssd-su-co/components/SuCoReportForm";

/** Cửa luân chuyển số lượng — không phải đề nghị danh mục, không phải Hỏng/Mất. */
export function CSSDCatalogLuanChuyenTab() {
  const searchParams = useSearchParams();
  const ma = String(searchParams.get("ma") || "").trim();

  return (
    <div className="space-y-2">
      <p className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-600">
        Chuyển số lượng kho ↔ bộ hoặc bộ ↔ bộ. Không tạo phiếu đề nghị danh mục và không ghi hỏng/mất.
      </p>
      <SuCoReportForm
        entryMode="luan-chuyen"
        initialStation="TIEP_NHAN"
        initialGroup="INSTRUMENT"
        initialTypeId="INSTRUMENT_MOVE"
        initialMaQR={ma || undefined}
        enabled
      />
    </div>
  );
}
