// src/modules/giam-sat-vst/components/VSTHistoryColumns.tsx
"use client";

import React from "react";
import { Column } from "@/components/shared/AdvancedDataTable";
import { vstSessionDisplayRef } from "../lib/vst-display-ref";
import { classifyVstAction } from "../lib/vst-action-classifier";
import type { VstHistoryRow } from "../lib/vst-read-utils";

function formatHHmm(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "--:--";
  const d = new Date(raw);
  return Number.isFinite(d.getTime())
    ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
}

function cellDateSession(s: Record<string, unknown>) {
  const raw = (s.ngay_giam_sat as string) || (s.created_at as string);
  const d = raw ? new Date(raw.includes("T") ? raw : `${raw}T12:00:00`) : null;
  const dateLine = d ? d.toLocaleDateString("vi-VN") : "---";
  const timeLine = (s.created_at as string) ? new Date(String(s.created_at)).toLocaleTimeString("vi-VN") : null;
  return (
    <div>
      <div className="font-bold text-slate-700">{dateLine}</div>
      <div className="text-[10px] text-slate-400 font-bold uppercase">
        {timeLine ? `Tạo LS: ${timeLine}` : "\u00a0"}
      </div>
    </div>
  );
}

/**
 * Trả về mảng column config cho HistoryTable VST
 */
export function getVSTHistoryColumns(
  printingSessionId: string | null,
  onPrint: (sessionId: string) => void,
  onEdit: ((sessionId: string) => void) | undefined,
  canEdit: boolean,
): Column<VstHistoryRow>[] {
  return [
    {
      header: "Ngày phiên",
      accessorKey: "ngay_giam_sat",
      sortable: true,
      cell: (s: Record<string, unknown>) => cellDateSession(s),
    },
    {
      header: "MÃ PHIÊN",
      accessorKey: "ma_hien_thi",
      sortable: false,
      cell: (s: { id?: string; ngay_giam_sat?: string; ma_hien_thi?: string }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-[#026f17] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
            {s.ma_hien_thi || (s.id ? vstSessionDisplayRef(s.id, s.ngay_giam_sat) : "")}
          </span>
        </div>
      ),
    },

    {
      header: "Khoa / Khu vực",
      accessorKey: "khoa",
      sortable: true,
      cell: (s: VstHistoryRow) => (
        <div>
          <div className="font-black text-[#026f17] uppercase tracking-tighter">{s.danh_muc_khoa?.ten_danh_muc || "---"}</div>
          <div className="text-xs font-bold text-slate-500">
            {(s.danh_muc_khu_vuc?.ten_danh_muc || "").trim() || "—"}
            {String(s.vi_tri_cu_the || "").trim() ? ` · ${String(s.vi_tri_cu_the).trim()}` : ""}
          </div>
        </div>
      )
    },
    {
      header: "Hình thức",
      accessorKey: "hinh_thuc_giam_sat",
      sortable: true,
      cell: (s: VstHistoryRow) => (
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase">
            {s.hinh_thuc_giam_sat || "---"}
          </span>
          <div className="text-[10px] font-bold text-slate-500">
            {s.cach_thuc_giam_sat || "---"}
          </div>
        </div>
      )
    },
    {
      header: "Thời gian phiên",
      accessorKey: "thoi_gian_bat_dau",
      sortable: true,
      cell: (s: VstHistoryRow) => (
        <span className="text-[10px] font-bold text-slate-500">
          {formatHHmm(s.thoi_gian_bat_dau)}
          {' - '}
          {formatHHmm(s.thoi_gian_ket_thuc)}
        </span>
      )
    },
    {
      header: "Cơ hội",
      accessorKey: "total_opps",
      cell: (s: VstHistoryRow) => {
        const total = Number(s.total_opps ?? s.tong_co_hoi ?? s.observations?.length ?? 0);
        return <span className="font-bold text-slate-600">{total}</span>;
      }
    },
    {
      header: "Tuân thủ",
      accessorKey: "compliance",
      cell: (s: VstHistoryRow) => {
        const total = Number(s.total_opps ?? s.tong_co_hoi ?? s.observations?.length ?? 0);
        const compliantFromView = Number(s.da_tuan_thu ?? -1);
        const compliant =
          compliantFromView >= 0
            ? compliantFromView
            : (s.observations || []).filter((o: { hanh_dong?: string }) => classifyVstAction(o.hanh_dong).isCompliant).length;
        if (total <= 0) return <span className="text-slate-400">Không áp dụng</span>;
        const rate = Math.round((compliant / total) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full animate-pulse ${rate >= 90 ? "bg-[#026f17]" : "bg-amber-500"}`} />
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[11px] shadow-sm ${
              rate >= 90 ? "bg-[#026f17] text-white" : "bg-amber-500 text-white"
            }`}>
              {rate}%
            </div>
          </div>
        );

      }
    },
    {
      header: "Người GS",
      accessorKey: "nguoi_giam_sat_id",
      sortable: true,
      cell: (s: VstHistoryRow) => (
        <span className="font-bold text-slate-600">{s.nguoi_giam_sat?.ho_ten || s.nguoi_giam_sat_id || "---"}</span>
      )
    },
    {
      header: "Thao tác",
      accessorKey: "id",
      cell: (s: VstHistoryRow) => (
        <div className="flex flex-row items-center justify-end gap-2">
          {onEdit && canEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(String(s.id || ""));
              }}
              className="h-10 px-4 rounded-full bg-white border border-[#026f17]/30 text-[#026f17] font-black text-[10px] uppercase tracking-widest hover:bg-[#026f17]/10 transition-all"
              disabled={!s?.id}
            >
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrint(String(s.id || ""));
            }}
            disabled={printingSessionId === String(s.id || "")}
            className="h-10 px-6 rounded-full bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all disabled:opacity-50"
          >
            {printingSessionId === String(s.id || "") ? "⏳..." : "🖨️ In Phiếu"}
          </button>
        </div>
      )
    }
  ];
}
