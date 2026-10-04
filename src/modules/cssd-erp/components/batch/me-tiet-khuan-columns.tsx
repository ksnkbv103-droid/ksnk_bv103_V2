// src/modules/cssd-erp/components/batch/me-tiet-khuan-columns.tsx
"use client";

import type { Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import {
  CSSD_UI_CELL_CODE,
  CSSD_UI_CELL_INDEX,
  CSSD_UI_CELL_META,
} from "../../shared/ui/cssd-ui-chrome";
import { meListPrimaryAction, meTrangThaiBadge } from "../../lib/me-tiet-khuan-slip-ux";

export function buildMeTietKhuanBatchColumns(opts?: {
  onContinue?: (row: any) => void;
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
    cell: (i: any) => {
      const thuHoiThanTrong =
        i.ket_qua_test === true && String(i.trang_thai || i.trang_thai_me || "").toUpperCase() === "THU_HOI";
      const label = thuHoiThanTrong
        ? "Đạt QC · thu hồi thận trọng"
        : i.ket_qua_test === true
          ? "Đạt QC"
          : i.ket_qua_test === false
            ? "Lỗi"
            : "Chưa QC";
      const cls = thuHoiThanTrong
        ? "bg-amber-50 text-amber-800"
        : i.ket_qua_test === true
          ? "bg-emerald-50 text-emerald-600"
          : i.ket_qua_test === false
            ? "bg-red-50 text-red-600"
            : "bg-slate-100 text-slate-500";
      return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
    },
  },
  {
    header: "Trạng thái",
    accessorKey: "trang_thai",
    sortable: true,
    cell: (i: any) => {
      const badge = meTrangThaiBadge(String(i.trang_thai || ""));
      return <span className={badge.className}>{badge.label}</span>;
    },
  },
  {
    header: "Ghi chú",
    accessorKey: "ghi_chu",
    sortable: true,
    cell: (i: any) => <span className={`block max-w-[150px] truncate ${CSSD_UI_CELL_META}`}>{i.ghi_chu || "---"}</span>,
  },
  {
    header: "Thao tác",
    accessorKey: "trang_thai",
    cell: (i: any) => {
      const action = meListPrimaryAction(String(i.trang_thai || ""));
      if (!action || !opts?.onContinue) return <span className={CSSD_UI_CELL_META}>—</span>;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            opts.onContinue?.(i);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 bv103-type-label font-semibold text-emerald-900 hover:bg-emerald-100"
          title={action.label}
        >
          {action.label}
        </button>
      );
    },
  },
  ];

  return cols;
}
