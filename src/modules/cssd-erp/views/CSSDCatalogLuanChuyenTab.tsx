"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, FileX, History, PackagePlus } from "lucide-react";
import InstrumentTransferForm from "@/modules/cssd-erp/components/inventory/InstrumentTransferForm";
import InstrumentReceiveNewForm from "@/modules/cssd-erp/components/inventory/InstrumentReceiveNewForm";
import InstrumentDecommissionForm from "@/modules/cssd-erp/components/inventory/InstrumentDecommissionForm";
import InstrumentLifecycleHistoryTable from "@/modules/cssd-erp/components/inventory/InstrumentLifecycleHistoryTable";

type SubTab = "TRANSFER" | "RECEIVE" | "DECOMMISSION" | "HISTORY";

/** Cửa Vòng đời & Luân chuyển dụng cụ (BIZ-03 & BIZ-04) — tách bạch hoàn toàn khỏi bảng sự cố. */
export function CSSDCatalogLuanChuyenTab({ onSubmitted }: { onSubmitted?: () => void }) {
  const searchParams = useSearchParams();
  const ma = String(searchParams.get("ma") || "").trim();
  const [subTab, setSubTab] = useState<SubTab>("TRANSFER");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab("TRANSFER")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              subTab === "TRANSFER"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ArrowLeftRight size={15} />
            Điều chuyển kho &amp; bộ
          </button>

          <button
            type="button"
            onClick={() => setSubTab("RECEIVE")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              subTab === "RECEIVE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <PackagePlus size={15} />
            Nhập mới từ Trang bị/VT
          </button>

          <button
            type="button"
            onClick={() => setSubTab("DECOMMISSION")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              subTab === "DECOMMISSION"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileX size={15} />
            Loại biên / Thanh lý hao mòn
          </button>

          <button
            type="button"
            onClick={() => setSubTab("HISTORY")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              subTab === "HISTORY"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History size={15} />
            Nhật ký biến động vòng đời
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-medium px-2 hidden sm:inline">
          {subTab === "TRANSFER" && "Điều chuyển số lượng giữa kho lẻ và bộ hoặc giữa 2 bộ"}
          {subTab === "RECEIVE" && "Tiếp nhận tăng cơ số kho lẻ từ Phòng Trang bị y tế"}
          {subTab === "DECOMMISSION" && "Thanh lý dụng cụ hao mòn kỹ thuật (không ghi nhận sự cố)"}
          {subTab === "HISTORY" && "Nhật ký theo dõi luân chuyển & biến động vòng đời"}
        </span>
      </div>

      {subTab === "TRANSFER" && (
        <InstrumentTransferForm
          initialMa={ma || undefined}
          onSubmitted={onSubmitted}
        />
      )}

      {subTab === "RECEIVE" && (
        <InstrumentReceiveNewForm
          onSubmitted={onSubmitted}
        />
      )}

      {subTab === "DECOMMISSION" && (
        <InstrumentDecommissionForm
          onSubmitted={onSubmitted}
        />
      )}

      {subTab === "HISTORY" && (
        <InstrumentLifecycleHistoryTable />
      )}
    </div>
  );
}
