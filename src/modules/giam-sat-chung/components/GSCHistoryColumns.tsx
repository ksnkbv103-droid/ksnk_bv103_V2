// src/modules/giam-sat-chung/components/GSCHistoryColumns.tsx
"use client";

import React from "react";
import { Column } from "@/components/shared/AdvancedDataTable";
import { formatDateVi, formatTimeVi } from "@/lib/format-datetime-vi";
import { formatGscHistoryScore } from "../lib/gsc-score-display";
import { gscSessionDisplayRef } from "../lib/gsc-display-ref";
import type { GscHistoryRow } from "../lib/gsc-read-utils";
import { gscTableChrome as G } from "../lib/gsc-table-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

/**
 * Trả về mảng column config cho HistoryTable Giám sát chung
 * Thiết kế: tối giản, nhất quán font 12px (text-xs), tông trung tính chuyên nghiệp, đồng bộ với VST.
 */
export function getGSCHistoryColumns(
  onView: (session: GscHistoryRow) => void,
  onPrint: (session: GscHistoryRow) => void,
  onEdit: ((session: GscHistoryRow) => void) | undefined,
  canEdit: boolean,
): Column<GscHistoryRow>[] {
  return [
    {
      header: "Ngày giám sát",
      accessorKey: "ngay_giam_sat",
      sortable: true,
      headerClassName: "w-[7rem] min-w-[7rem]",
      cellClassName: "w-[7rem] min-w-[7rem]",
      cell: (s: Record<string, unknown>) => {
        const raw = s.ngay_giam_sat ? String(s.ngay_giam_sat) : "";
        const dateLine = formatDateVi(raw ? raw.slice(0, 10) : null);
        const tg = s.thoi_gian_ghi_nhan ? String(s.thoi_gian_ghi_nhan) : "";
        const timeLine = tg ? formatTimeVi(tg, "") : null;
        return (
          <div className="min-w-0">
            <p className={`text-xs ${G.cellBody}`}>{dateLine}</p>
            {timeLine && <p className="text-[11px] text-slate-400 mt-0.5">{timeLine}</p>}
          </div>
        );
      },
    },
    {
      header: "Mã phiên",
      accessorKey: "ma_hien_thi",
      sortable: false,
      headerClassName: bv103TableLayout.colCodeQr,
      cellClassName: bv103TableLayout.colCodeQr,
      cell: (s: { id?: string; ngay_giam_sat?: string; ma_hien_thi?: string }) => {
        const label = s.ma_hien_thi || (s.id ? gscSessionDisplayRef(s.id, s.ngay_giam_sat) : "—");
        const qrCode = s.id ? buildEntityQrCode("GSC_SESSION", s.id) : "";
        return (
          <span className="inline-flex max-w-full items-center gap-1.5">
            {qrCode ? <InlineEntityQrThumb code={qrCode} size={28} /> : null}
            <span className={`${G.cellCode} truncate text-slate-600`}>{label}</span>
          </span>
        );
      },
    },
    {
      header: "Bảng kiểm",
      accessorKey: "loai_bang_kiem",
      sortable: true,
      headerClassName: "w-[15rem] min-w-[15rem]",
      cellClassName: "w-[15rem] min-w-[15rem]",
      cell: (s: Record<string, unknown>) => {
        const ma = String(s.loai_bang_kiem ?? "").trim();
        const ten = String(s.bang_kiem_label ?? s.ten_bang_kiem_hien_thi ?? "").trim() || ma || "—";
        const showMa = ma && ma !== ten;
        return (
          <div className="min-w-0">
            <p className={`text-xs ${G.cellTitle} line-clamp-2`} title={ten}>{ten}</p>
            {showMa && <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate" title={ma}>{ma}</p>}
          </div>
        );
      },
    },
    {
      header: "Khoa",
      accessorKey: "khoa_id",
      sortable: true,
      headerClassName: "w-[4rem] min-w-[4rem]",
      cellClassName: "w-[4rem] min-w-[4rem]",
      cell: (s: GscHistoryRow) => (
        <span className="text-xs font-semibold text-slate-800" title={s.khoa_name}>
          {formatKhoaCompactLabel({ ma_khoa: s.ma_khoa, ten_khoa: s.khoa_name })}
        </span>
      ),
    },
    {
      header: "Đối tượng",
      accessorKey: "nhan_vien_id",
      sortable: false,
      headerClassName: "w-[11rem] min-w-[11rem]",
      cellClassName: "w-[11rem] min-w-[11rem]",
      cell: (s: GscHistoryRow) => {
        const name = typeof s.ten_nhan_vien_display === "string" && s.ten_nhan_vien_display.trim() ? s.ten_nhan_vien_display : "—";
        const job = typeof s.nghe_nghiep_name === "string" && s.nghe_nghiep_name.trim() ? s.nghe_nghiep_name : "—";
        return (
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2">{name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{job}</p>
          </div>
        );
      },
    },
    {
      header: "Người gs",
      accessorKey: "nguoi_giam_sat_id",
      sortable: true,
      headerClassName: "w-[11rem] min-w-[11rem]",
      cellClassName: "w-[11rem] min-w-[11rem]",
      cell: (s) => {
        const gs = typeof s.gs_ho_ten === "string" && s.gs_ho_ten.trim() ? s.gs_ho_ten : null;
        const id = typeof s.nguoi_giam_sat_id === "string" && s.nguoi_giam_sat_id.trim() ? s.nguoi_giam_sat_id : null;
        return <span className="text-xs font-medium text-slate-600 line-clamp-1">{gs || id || "—"}</span>;
      },
    },
    {
      header: "Tuân thủ",
      accessorKey: "tong_diem",
      sortable: true,
      headerClassName: "w-[4.5rem] min-w-[4.5rem] text-center",
      cellClassName: "w-[4.5rem] min-w-[4.5rem] text-center",
      cell: (s: GscHistoryRow) => {
        const { label, className, title } = formatGscHistoryScore(s as Record<string, unknown>);
        return (
          <span className={`text-xs font-bold ${className}`} title={title}>
            {label}
          </span>
        );
      },
    },
    {
      header: "Thao tác",
      accessorKey: "actions",
      headerClassName: bv103TableLayout.colActionsWide,
      cellClassName: bv103TableLayout.colActionsWide,
      cell: (s: GscHistoryRow) => (
        <div className={bv103TableLayout.actionsCell}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(s); }}
            className={C.tableActionBtn}
          >
            Xem
          </button>
          {onEdit && canEdit ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(s); }}
              className={C.tableActionBtn}
            >
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrint(s); }}
            className={C.tableActionBtnPrimary}
          >
            In
          </button>
        </div>
      ),
    },
  ];
}
