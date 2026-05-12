// src/modules/giam-sat-chung/components/GSCHistoryColumns.tsx
"use client";

import React from "react";
import { format } from "date-fns";
import { Column } from "@/components/shared/AdvancedDataTable";
import { gscSessionDisplayRef } from "../lib/gsc-display-ref";

function cellNgayGioRow(s: Record<string, unknown>) {
  const raw = s.ngay_giam_sat ? String(s.ngay_giam_sat) : "";
  const norm = raw && !raw.includes("T") ? `${raw.slice(0, 10)}T12:00:00` : raw;
  const d = norm ? new Date(norm) : null;
  const dateLine = d && Number.isFinite(d.getTime()) ? format(d, "dd/MM/yyyy") : "—";
  const tg = s.thoi_gian_ghi_nhan ? String(s.thoi_gian_ghi_nhan) : "";
  const tObj = tg ? new Date(tg) : null;
  const timeLine = tObj && Number.isFinite(tObj.getTime()) ? format(tObj, "HH:mm") : null;
  return (
    <div className="min-w-[5.5rem]">
      <p className="font-black text-slate-700 whitespace-nowrap text-[13px] leading-tight">{dateLine}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap leading-tight mt-0.5">
        {timeLine ?? "\u00a0"}
      </p>
    </div>
  );
}

/**
 * Trả về mảng column config cho HistoryTable Giám sát chung
 */
export function getGSCHistoryColumns(
  onView: (session: any) => void,
  onPrint: (session: any) => void,
  onEdit: ((session: any) => void) | undefined,
  canEdit: boolean,
): Column<any>[] {
  return [
    {
      header: "Ngày / giờ",
      accessorKey: "ngay_giam_sat",
      sortable: true,
      headerClassName: "w-[6.5rem] min-w-[6.5rem] max-w-[7rem]",
      cellClassName: "w-[6.5rem] min-w-[6.5rem] max-w-[7rem]",
      cell: (s: Record<string, unknown>) => cellNgayGioRow(s),
    },
    {
      header: "Mã phiên",
      accessorKey: "ma_hien_thi",
      sortable: false,
      headerClassName: "w-[7.5rem] min-w-[7.5rem] max-w-[8.5rem]",
      cellClassName: "w-[7.5rem] min-w-[7.5rem] max-w-[8.5rem]",
      cell: (s: { id?: string; ngay_giam_sat?: string; ma_hien_thi?: string }) => (
        <span className="inline-block font-mono text-[10px] font-bold text-[#026f17] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm whitespace-nowrap max-w-full truncate">
          {s.ma_hien_thi || (s.id ? gscSessionDisplayRef(s.id, s.ngay_giam_sat) : "")}
        </span>
      ),
    },

    {
      header: "Bảng kiểm",
      accessorKey: "loai_bang_kiem",
      sortable: true,
      headerClassName: "min-w-[11rem] max-w-[16rem] w-[14rem]",
      cellClassName: "min-w-[11rem] max-w-[16rem] w-[14rem]",
      cell: (s: Record<string, unknown>) => {
        const ma = String(s.loai_bang_kiem ?? "").trim();
        const ten = String(s.bang_kiem_label ?? s.ten_bang_kiem_hien_thi ?? "").trim() || ma || "—";
        const showMa = ma && ma !== ten;
        return (
          <div className="min-w-0 py-0.5">
            <p
              className="text-[12px] font-semibold text-slate-800 leading-snug line-clamp-2 break-words"
              title={ten}
            >
              {ten}
            </p>
            {showMa ? (
              <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={`Mã: ${ma}`}>
                {ma}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Khoa / Khu vực",
      accessorKey: "khoa_id",
      sortable: true,
      headerClassName: "min-w-[10rem] max-w-[13rem] w-[11rem]",
      cellClassName: "min-w-[10rem] max-w-[13rem] w-[11rem]",
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-black text-[#026f17] uppercase tracking-tighter text-[11px] leading-tight line-clamp-2 break-words">
            {s.khoa_name || "N/A"}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight mt-0.5 line-clamp-1 truncate">
            {s.khu_name || "N/A"}
          </p>
        </div>
      ),
    },
    {
      header: "Đối tượng / Nghề",
      accessorKey: "nhan_vien_id",
      sortable: false,
      headerClassName: "min-w-[9.5rem] max-w-[13rem] w-[11rem]",
      cellClassName: "min-w-[9.5rem] max-w-[13rem] w-[11rem]",
      cell: (s: any) => (
        <div className="min-w-0">
          <p className="font-bold text-slate-700 text-[12px] leading-tight line-clamp-2 break-words">
            {s.ten_nhan_vien_display || "—"}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-400 leading-tight mt-0.5 line-clamp-1 truncate">
            {s.nghe_nghiep_name || "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Người GS",
      accessorKey: "nguoi_giam_sat_id",
      sortable: true,
      headerClassName: "min-w-[7rem] max-w-[9rem] w-[8rem]",
      cellClassName: "min-w-[7rem] max-w-[9rem] w-[8rem]",
      cell: (s) => (
        <span className="font-bold text-slate-600 text-[12px] line-clamp-2 break-words block min-w-0">
          {s.gs_ho_ten || s.nguoi_giam_sat_id || "—"}
        </span>
      ),
    },
    {
      header: "Tuân thủ",
      accessorKey: "tong_diem",
      sortable: true,
      headerClassName: "w-[5.5rem] min-w-[5.5rem] text-center",
      cellClassName: "w-[5.5rem] min-w-[5.5rem] text-center",
      cell: (s) => (
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
          <div className={`h-2 w-2 shrink-0 rounded-full animate-pulse ${s.tong_diem >= 90 ? "bg-[#026f17]" : "bg-amber-500"}`} />
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full font-black text-[11px] shadow-sm ${
            s.tong_diem >= 90 ? "bg-[#026f17] text-white" : "bg-amber-500 text-white"
          }`}>
            {s.tong_diem}%
          </div>
        </div>

      ),
    },
    {
      header: "Thao tác",
      accessorKey: "actions",
      headerClassName: "w-[10.5rem] min-w-[10.5rem] text-right",
      cellClassName: "w-[10.5rem] min-w-[10.5rem] text-right",
      cell: (s) => (
        <div className="flex flex-nowrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(s);
            }}
            className="h-9 shrink-0 px-2.5 rounded-lg border border-[#026f17]/30 bg-[#026f17]/5 text-[#026f17] font-black text-[9px] uppercase tracking-wide hover:bg-[#026f17]/10 whitespace-nowrap touch-manipulation"
          >
            Xem
          </button>
          {onEdit && canEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s);
              }}
              className="h-9 shrink-0 px-2.5 rounded-lg bg-white border border-[#026f17]/30 text-[#026f17] font-black text-[9px] uppercase tracking-wide hover:bg-[#026f17]/10 whitespace-nowrap touch-manipulation"
            >
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrint(s);
            }}
            className="h-9 shrink-0 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-wide hover:border-[#026f17] hover:text-[#026f17] shadow-sm whitespace-nowrap touch-manipulation"
          >
            In
          </button>
        </div>
      ),
    },
  ];
}
