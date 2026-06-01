"use client";

import { Pencil, Trash2 } from "lucide-react";
import { getQlcvWorkflowGateBadgeClass, getQlcvWorkflowGateLabel } from "../lib/qlcv-workflow-display";
import { formatMucDoUuTienLabel } from "../lib/qlcv-labels";
import { canShowDeleteTask, canShowEditTaskMetadata, type QlcvUiAccessFlags } from "../lib/qlcv-access";
import type { CongViecView } from "../types";

export type QlcvTableColumnHandlers = {
  qlcvUi: QlcvUiAccessFlags;
  onEdit: (row: CongViecView) => void;
  onDelete: (row: CongViecView) => Promise<void>;
};

export function buildQlcvCommandTableColumns(h: QlcvTableColumnHandlers) {
  return [
    {
      header: "Nhiệm vụ",
      accessorKey: "tieu_de",
      headerClassName: "min-w-[11rem] w-[26%]",
      cellClassName: "min-w-0 align-top",
      cell: (row: CongViecView) => (
        <div className="flex flex-col gap-0.5 py-1 text-left">
          <span className="font-semibold text-slate-800">{row.tieu_de}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {row.loai_cong_viec || "—"}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Người giao",
      accessorKey: "nguoi_giao_ten",
      headerClassName: "w-[12%] min-w-[6.5rem]",
      cellClassName: "align-middle",
      cell: (row: CongViecView) => (
        <span className="text-sm text-slate-700">{row.nguoi_giao_ten || row.nguoi_tao_ten || "—"}</span>
      ),
      sortable: true,
    },
    {
      header: "Phụ trách",
      accessorKey: "nguoi_phu_trach_ten",
      headerClassName: "w-[12%] min-w-[6.5rem]",
      cellClassName: "align-middle",
      cell: (row: CongViecView) => (
        <span className="text-sm font-medium text-slate-800">{row.nguoi_phu_trach_ten || "—"}</span>
      ),
      sortable: true,
    },
    {
      header: "Cổng / trách nhiệm",
      accessorKey: "trang_thai",
      headerClassName: "min-w-[9rem] w-[14%]",
      cellClassName: "align-middle",
      cell: (row: CongViecView) => (
        <span
          className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium normal-case ${getQlcvWorkflowGateBadgeClass(row)}`}
        >
          {getQlcvWorkflowGateLabel(row)}
        </span>
      ),
      sortable: true,
    },
    {
      header: "Tiến độ",
      accessorKey: "phan_tram_hoan_thanh",
      headerClassName: "w-24 whitespace-nowrap",
      cellClassName: "align-middle",
      cell: (row: CongViecView) => (
        <div className="flex min-w-[4.5rem] items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${Math.min(100, Math.max(0, Number(row.phan_tram_hoan_thanh ?? 0)))}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-700">
            {Number(row.phan_tram_hoan_thanh ?? 0)}%
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Hạn",
      accessorKey: "han_hoan_thanh",
      headerClassName: "w-24 whitespace-nowrap",
      cellClassName: "whitespace-nowrap align-middle",
      cell: (row: CongViecView) => (
        <span
          className={`text-[11px] font-semibold ${row.is_qua_han ? "text-red-600" : "text-slate-600"}`}
        >
          {row.han_hoan_thanh ? new Date(row.han_hoan_thanh).toLocaleDateString("vi-VN") : "—"}
        </span>
      ),
      sortable: true,
    },
    {
      header: "Ưu tiên",
      accessorKey: "muc_do_uu_tien",
      headerClassName: "w-28 whitespace-nowrap hidden lg:table-cell",
      cellClassName: "align-middle hidden lg:table-cell",
      cell: (row: CongViecView) => {
        const priorityColors: Record<string, string> = {
          CAO: "text-red-700 bg-red-50 border-red-100",
          TRUNG_BINH: "text-amber-700 bg-amber-50 border-amber-100",
          THAP: "text-slate-600 bg-slate-50 border-slate-100",
        };
        const code = String(row.muc_do_uu_tien || "TRUNG_BINH").trim().toUpperCase();
        const color = priorityColors[code] || priorityColors.TRUNG_BINH;
        return (
          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium normal-case ${color}`}>
            {formatMucDoUuTienLabel(row.muc_do_uu_tien)}
          </span>
        );
      },
      sortable: true,
    },
    {
      header: "",
      accessorKey: "id",
      headerClassName: "w-[9rem] text-right",
      cellClassName: "align-middle text-right",
      cell: (row: CongViecView) => (
        <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canShowEditTaskMetadata(row, h.qlcvUi) ? (
            <button
              type="button"
              title="Sửa"
              className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              onClick={() => h.onEdit(row)}
            >
              <Pencil size={12} aria-hidden /> Sửa
            </button>
          ) : null}
          {canShowDeleteTask(row, h.qlcvUi) ? (
            <button
              type="button"
              title="Xóa"
              className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50/90 px-2 text-[10px] font-semibold uppercase tracking-wide text-red-700 hover:bg-red-100"
              onClick={() => void h.onDelete(row)}
            >
              <Trash2 size={12} aria-hidden />
            </button>
          ) : null}
        </div>
      ),
    },
  ];
}
