// src/modules/cssd-erp/components/batch/me-tiet-khuan-columns.tsx
"use client";

import type { Column } from "@/components/shared/AdvancedDataTable";
import { Printer } from "lucide-react";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import {
  CSSD_UI_CELL_CODE,
  CSSD_UI_CELL_INDEX,
  CSSD_UI_CELL_META,
} from "../../shared/ui/cssd-ui-chrome";

export function buildMeTietKhuanBatchColumns(opts?: {
  onPrintBatch?: (batchId: string) => void;
  isPrinting?: boolean;
}): Column<any>[] {
  const cols: Column<any>[] = [
  {
    header: "Mã lô",
    accessorKey: "ma_lo_tiet_khuan",
    cell: (i: any) => {
      const code = String(i.ma_lo_tiet_khuan || "").trim();
      return (
        <span className="inline-flex items-center gap-2">
          {code ? <InlineEntityQrThumb code={code} size={32} /> : null}
          <span className={CSSD_UI_CELL_CODE}>{code || "—"}</span>
        </span>
      );
    },
  },
  {
    header: "Số bộ trong mẻ",
    accessorKey: "so_bo_trong_me",
    cell: (i: any) => (
      <span className={`${CSSD_UI_CELL_INDEX} tabular-nums text-slate-700`}>
        {typeof i.so_bo_trong_me === "number" ? i.so_bo_trong_me : 0}
      </span>
    ),
  },
  {
    header: "Thiết bị",
    accessorKey: "thiet_bi.ten_thiet_bi",
    cell: (i: any) => <span className={CSSD_UI_CELL_META}>{i.thiet_bi?.ten_thiet_bi || "N/A"}</span>,
  },
  {
    header: "Qc test",
    accessorKey: "ket_qua_test",
    cell: (i: any) => (
      <span
        className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
          i.ket_qua_test === true ? "bg-emerald-50 text-emerald-600" : i.ket_qua_test === false ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        {i.ket_qua_test === true ? "ĐẠT QC" : i.ket_qua_test === false ? "LỖI" : "CHƯA QC"}
      </span>
    ),
  },
  {
    header: "Trạng thái",
    accessorKey: "trang_thai",
    cell: (i: any) => {
      const state = String(i.trang_thai || "");
      // Domain: CHO_BI / Quarantine_BI = implant chờ BI (−); UI-ready map (derive full gate = P1/write path).
      const STATE_BADGES: Record<string, { label: string; cls: string }> = {
        DANG_CHUAN_NAP: { label: "📥 Chuẩn bị nạp", cls: "bg-sky-50 text-sky-700 border-sky-100" },
        DANG_TIET_KHUAN: { label: "🔥 Đang tiệt khuẩn", cls: "bg-blue-50 text-blue-700 border-blue-100" },
        CHO_DANH_GIA_QC: { label: "🔬 Chờ đánh giá QC", cls: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" },
        CHO_BI: { label: "⏳ Chờ BI (quarantine)", cls: "bg-violet-50 text-violet-800 border-violet-200" },
        Quarantine_BI: { label: "⏳ Chờ BI (quarantine)", cls: "bg-violet-50 text-violet-800 border-violet-200" },
        QC_KHONG_DAT: { label: "❌ Lỗi tiệt khuẩn", cls: "bg-red-50 text-red-700 border-red-100" },
        HOAN_THANH: { label: "🏆 Đạt (Chờ cấp phát)", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      };
      const badge = STATE_BADGES[state] || { label: state, cls: "bg-slate-50 text-slate-600 border-slate-100" };
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${badge.cls}`}>
          {badge.label}
        </span>
      );
    },
  },
  {
    header: "Ghi chú",
    accessorKey: "ghi_chu",
    cell: (i: any) => <span className={`block max-w-[150px] truncate ${CSSD_UI_CELL_META}`}>{i.ghi_chu || "---"}</span>,
  },
  ];

  if (opts?.onPrintBatch) {
    cols.push({
      header: "In phiếu",
      accessorKey: "id",
      cell: (i: any) => {
        const canPrint = i.ket_qua_test === true;
        if (!canPrint) return <span className={CSSD_UI_CELL_META}>—</span>;
        return (
          <button
            type="button"
            disabled={opts.isPrinting}
            onClick={(e) => {
              e.stopPropagation();
              opts.onPrintBatch?.(String(i.id));
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--primary)] hover:bg-emerald-50 disabled:opacity-50"
            title="In phiếu mẻ A4"
          >
            <Printer size={14} /> Phiếu mẻ
          </button>
        );
      },
    });
  }

  return cols;
}
