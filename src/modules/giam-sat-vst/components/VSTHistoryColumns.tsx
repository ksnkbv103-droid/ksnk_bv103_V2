// src/modules/giam-sat-vst/components/VSTHistoryColumns.tsx
"use client";

import React from "react";
import { Column } from "@/components/shared/AdvancedDataTable";
import { vstSessionDisplayRef } from "../lib/vst-display-ref";
import { formatPercent2FromRatio } from "@/lib/analytics/supervision-percent";
import { classifyVstAction } from "../lib/vst-action-classifier";
import type { VstHistoryRow } from "../lib/vst-read-utils";
import { gscTableChrome as G } from "@/modules/giam-sat-chung/lib/gsc-table-chrome";

function formatHHmm(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  return Number.isFinite(d.getTime())
    ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";
}

/**
 * Trả về mảng column config cho HistoryTable VST
 * Thiết kế: tối giản, nhất quán font 12px, không dùng badge màu mè, tông trung tính chuyên nghiệp.
 */
export function getVSTHistoryColumns(
  printingSessionId: string | null,
  onPrint: (sessionId: string) => void,
  onEdit: ((sessionId: string) => void) | undefined,
  canEdit: boolean,
): Column<VstHistoryRow>[] {
  return [
    {
      header: "Ngày giám sát",
      accessorKey: "ngay_giam_sat",
      sortable: true,
      headerClassName: "w-[7rem] min-w-[7rem]",
      cellClassName: "w-[7rem] min-w-[7rem]",
      cell: (s: Record<string, unknown>) => {
        const raw = (s.ngay_giam_sat as string) || (s.created_at as string);
        const d = raw ? new Date(raw.includes("T") ? raw : `${raw}T12:00:00`) : null;
        const dateLine = d ? d.toLocaleDateString("vi-VN") : "—";
        return <span className={`text-xs ${G.cellBody}`}>{dateLine}</span>;
      },
    },
    {
      header: "Mã phiên",
      accessorKey: "ma_hien_thi",
      sortable: false,
      headerClassName: "w-[9.5rem] min-w-[9.5rem]",
      cellClassName: "w-[9.5rem] min-w-[9.5rem]",
      cell: (s: { id?: string; ngay_giam_sat?: string; ma_hien_thi?: string }) => (
        <span className="font-mono text-[11px] font-semibold text-slate-600">
          {s.ma_hien_thi || (s.id ? vstSessionDisplayRef(s.id, s.ngay_giam_sat) : "—")}
        </span>
      ),
    },
    {
      header: "Khoa",
      accessorKey: "khoa",
      sortable: true,
      headerClassName: "w-[4rem] min-w-[4rem]",
      cellClassName: "w-[4rem] min-w-[4rem]",
      cell: (s: VstHistoryRow) => (
        <span className="text-xs font-semibold text-slate-800" title={s.khoa_name}>{s.ma_khoa || s.khoa_name || "—"}</span>
      )
    },
    {
      header: "Hình thức",
      accessorKey: "hinh_thuc_giam_sat",
      sortable: true,
      headerClassName: "w-[14rem] min-w-[14rem]",
      cellClassName: "w-[14rem] min-w-[14rem]",
      cell: (s: VstHistoryRow) => (
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">{s.hinh_thuc_giam_sat || "—"}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{s.cach_thuc_giam_sat || "—"}</p>
        </div>
      )
    },
    {
      header: "Thời gian",
      accessorKey: "thoi_gian_bat_dau",
      sortable: true,
      headerClassName: "w-[6.5rem] min-w-[6.5rem]",
      cellClassName: "w-[6.5rem] min-w-[6.5rem]",
      cell: (s: VstHistoryRow) => (
        <span className="text-xs text-slate-600">
          {formatHHmm(s.thoi_gian_bat_dau)} – {formatHHmm(s.thoi_gian_ket_thuc)}
        </span>
      )
    },
    {
      header: "Cơ hội",
      accessorKey: "total_opps",
      headerClassName: "w-[4rem] min-w-[4rem] text-center",
      cellClassName: "w-[4rem] min-w-[4rem] text-center",
      cell: (s: VstHistoryRow) => {
        const total = Number(s.total_opps ?? s.tong_co_hoi ?? s.observations?.length ?? 0);
        return <span className="text-xs font-semibold text-slate-700">{total}</span>;
      }
    },
    {
      header: "Tuân thủ",
      accessorKey: "compliance",
      headerClassName: "w-[4.5rem] min-w-[4.5rem] text-center",
      cellClassName: "w-[4.5rem] min-w-[4.5rem] text-center",
      cell: (s: VstHistoryRow) => {
        const total = Number(s.total_opps ?? s.tong_co_hoi ?? s.observations?.length ?? 0);
        const compliantFromView = Number(s.da_tuan_thu ?? -1);
        const compliant =
          compliantFromView >= 0
            ? compliantFromView
            : (s.observations || []).filter((o: { hanh_dong?: string }) => classifyVstAction(o.hanh_dong).isCompliant).length;
        if (total <= 0) return <span className="text-xs text-slate-400">—</span>;
        const rateLabel = formatPercent2FromRatio(compliant, total);
        const rateNum = total > 0 ? (compliant / total) * 100 : 0;
        return (
          <span className={`text-xs font-bold ${rateNum >= 80 ? "text-emerald-700" : rateNum >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {rateLabel}
          </span>
        );
      }
    },
    {
      header: "Người gs",
      accessorKey: "nguoi_giam_sat_id",
      sortable: true,
      headerClassName: "min-w-[10rem]",
      cellClassName: "min-w-[10rem]",
      cell: (s: VstHistoryRow) => (
        <span className="text-xs font-medium text-slate-600 line-clamp-1">{s.nguoi_giam_sat?.ho_ten || s.nguoi_giam_sat_id || "—"}</span>
      )
    },
    {
      header: "",
      accessorKey: "id",
      headerClassName: "w-[7.5rem] min-w-[7.5rem]",
      cellClassName: "w-[7.5rem] min-w-[7.5rem]",
      cell: (s: VstHistoryRow) => (
        <div className="flex items-center justify-end gap-1.5">
          {onEdit && canEdit ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(String(s.id || "")); }}
              className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-400 transition-colors"
              disabled={!s?.id}
            >
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrint(String(s.id || "")); }}
            disabled={printingSessionId === String(s.id || "")}
            className="h-8 px-3 rounded-md bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {printingSessionId === String(s.id || "") ? "Đang in..." : "In phiếu"}
          </button>
        </div>
      )
    }
  ];
}
