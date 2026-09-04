// src/modules/cssd-erp/components/batch/me-tiet-khuan-columns.tsx
"use client";

import type { Column } from "@/components/shared/AdvancedDataTable";
import Link from "next/link";
import { Printer, Undo2 } from "lucide-react";
import { cssdSuCoBatchRecallHref } from "@/lib/cssd-routes";
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
    sortable: true,
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
    sortable: true,
    cell: (i: any) => (
      <span className={`${CSSD_UI_CELL_INDEX} tabular-nums text-slate-700`}>
        {typeof i.so_bo_trong_me === "number" ? i.so_bo_trong_me : 0}
      </span>
    ),
  },
  {
    header: "Thiết bị",
    accessorKey: "thiet_bi.ten_thiet_bi",
    sortable: true,
    cell: (i: any) => <span className={CSSD_UI_CELL_META}>{i.thiet_bi?.ten_thiet_bi || "N/A"}</span>,
  },
  {
    header: "Qc test",
    accessorKey: "ket_qua_test",
    sortable: true,
    cell: (i: any) => (
      <span
        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
          i.ket_qua_test === true ? "bg-emerald-50 text-emerald-600" : i.ket_qua_test === false ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        {i.ket_qua_test === true ? "Đạt QC" : i.ket_qua_test === false ? "Lỗi" : "Chưa QC"}
      </span>
    ),
  },
  {
    header: "Trạng thái",
    accessorKey: "trang_thai",
    sortable: true,
    cell: (i: any) => {
      const state = String(i.trang_thai || "");
      // Domain: CHO_BI / Quarantine_BI = implant chờ BI (−); UI-ready map (derive full gate = P1/write path).
      const STATE_LABELS: Record<string, { label: string; cls: string }> = {
        DANG_CHUAN_NAP: { label: "Chuẩn bị nạp", cls: "text-[11px] font-medium text-sky-800" },
        DANG_TIET_KHUAN: { label: "Đang tiệt khuẩn", cls: "text-[11px] font-medium text-blue-800" },
        CHO_DANH_GIA_QC: { label: "Chờ đánh giá QC", cls: "text-[11px] font-medium text-amber-800" },
        CHO_BI: { label: "Chờ BI", cls: "text-[11px] font-medium text-violet-800" },
        Quarantine_BI: { label: "Chờ BI", cls: "text-[11px] font-medium text-violet-800" },
        QC_KHONG_DAT: { label: "Lỗi tiệt khuẩn", cls: "text-[11px] font-medium text-red-700" },
        HOAN_THANH: { label: "Đạt (chờ cấp phát)", cls: "text-[11px] font-medium text-emerald-800" },
      };
      const badge = STATE_LABELS[state] || { label: state || "—", cls: "text-[11px] font-medium text-slate-500" };
      return <span className={badge.cls}>{badge.label}</span>;
    },
  },
  {
    header: "Ghi chú",
    accessorKey: "ghi_chu",
    sortable: true,
    cell: (i: any) => <span className={`block max-w-[150px] truncate ${CSSD_UI_CELL_META}`}>{i.ghi_chu || "---"}</span>,
  },
  {
    header: "Thu hồi",
    accessorKey: "id",
    cell: (i: any) => {
      const id = String(i.id || "").trim();
      const maLo = String(i.ma_lo_tiet_khuan || "").trim();
      if (!id) return <span className={CSSD_UI_CELL_META}>—</span>;
      const href = cssdSuCoBatchRecallHref({ loTietKhuanId: id, maLo: maLo || undefined });
      return (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 bv103-type-label font-semibold text-amber-900 hover:bg-amber-100"
          title="Thu hồi theo mẻ — sự cố an toàn QT.24"
        >
          <Undo2 size={14} /> Thu hồi
        </Link>
      );
    },
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
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 bv103-type-label font-semibold text-[var(--primary)] hover:bg-emerald-50 disabled:opacity-50"
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
