"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { isBoardLaneDangLam, isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import type { QlcvBoardFilter } from "../lib/qlcv-board-filter";
import type { CongViecView } from "../types";

interface Props {
  tasks: CongViecView[];
  activeFilter?: QlcvBoardFilter | null;
  onFilterChange?: (filter: QlcvBoardFilter) => void;
}

const cardInteractive =
  "cursor-pointer select-none transition-[box-shadow,transform,border-color] hover:border-[#026f17]/35 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";

export function DashboardStats({ tasks, activeFilter, onFilterChange }: Props) {
  const list = tasks ?? [];

  const stats = useMemo(() => {
    const total = list.length;
    const completed = list.filter((t) => t.trang_thai === "HOAN_THANH").length;
    const inProgress = list.filter((t) => isBoardLaneDangLam(t)).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = list.filter((t) => isBoardLaneQuaHan(t)).length;

    const gateDeXuat = list.filter((t) => isDeXuatChoDuyet(t)).length;
    const gateNhan = list.filter((t) => isChoNhanViec(t)).length;
    const gateNghiemThu = list.filter((t) => isChoNghiemThuHoanThanh(t)).length;

    const nearDeadline = list.filter((t) => {
      if (!t.han_hoan_thanh) return false;
      if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return false;
      const d = new Date(t.han_hoan_thanh);
      d.setHours(0, 0, 0, 0);
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 2;
    }).length;

    return {
      total,
      completed,
      inProgress,
      overdueCount,
      gateDeXuat,
      gateNhan,
      gateNghiemThu,
      nearDeadline,
    };
  }, [list]);

  const pick = onFilterChange;

  const isSel = (f: QlcvBoardFilter) => (f === "TOTAL" && (activeFilter == null || activeFilter === "TOTAL")) || activeFilter === f;

  const baseCard = (f: QlcvBoardFilter, selected: boolean, className: string, children: React.ReactNode) => (
    <button
      type="button"
      key={f}
      disabled={!pick}
      onClick={() => pick?.(f)}
      className={`flex min-w-[9.5rem] shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm ${cardInteractive} ${className} ${
        selected ? "ring-2 ring-[#026f17]/40 ring-offset-1" : ""
      } ${pick ? "" : "cursor-default opacity-95"}`}
    >
      {children}
    </button>
  );

  const gatePills: { key: QlcvBoardFilter; label: string; value: number; className: string }[] = [];
  if (stats.gateDeXuat > 0) {
    gatePills.push({
      key: "GATE_DEXUAT",
      label: "Chờ phê đề xuất",
      value: stats.gateDeXuat,
      className: "border-violet-100 bg-violet-50/80 text-violet-900",
    });
  }
  if (stats.gateNhan > 0) {
    gatePills.push({
      key: "GATE_NHAN",
      label: "Chờ nhận việc",
      value: stats.gateNhan,
      className: "border-sky-100 bg-sky-50/80 text-sky-900",
    });
  }
  if (stats.gateNghiemThu > 0) {
    gatePills.push({
      key: "GATE_NGHIEMTHU",
      label: "Chờ nghiệm thu",
      value: stats.gateNghiemThu,
      className: "border-orange-100 bg-orange-50/80 text-orange-900",
    });
  }
  if (stats.nearDeadline > 0) {
    gatePills.push({
      key: "NEAR_DEADLINE",
      label: "Sắp đến hạn (≤2 ngày)",
      value: stats.nearDeadline,
      className: "border-amber-100 bg-amber-50/80 text-amber-950",
    });
  }

  return (
    <div className="flex min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {baseCard(
        "TOTAL",
        isSel("TOTAL"),
        "border-slate-200 bg-white",
        <>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-800">
            <ListTodo size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tổng công việc</p>
            <p className="text-xl font-bold leading-tight text-slate-800">{stats.total}</p>
          </div>
        </>,
      )}

      {baseCard(
        "IN_PROGRESS",
        isSel("IN_PROGRESS"),
        "border-slate-200 bg-white",
        <>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-blue-600">
            <Clock size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Đang làm</p>
            <p className="text-xl font-bold leading-tight text-blue-600">{stats.inProgress}</p>
          </div>
        </>,
      )}

      {baseCard(
        "COMPLETED",
        isSel("COMPLETED"),
        "border-slate-200 bg-white",
        <>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-emerald-600">
            <CheckCircle2 size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Đã hoàn thành</p>
            <p className="text-xl font-bold leading-tight text-emerald-600">{stats.completed}</p>
          </div>
        </>,
      )}

      {baseCard(
        "OVERDUE",
        isSel("OVERDUE"),
        "border-red-100 bg-red-50",
        <>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
            <AlertTriangle size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-800/80">Cần xử lý gấp</p>
            <p className="text-xl font-bold leading-tight text-red-600">{stats.overdueCount}</p>
          </div>
        </>,
      )}

      {gatePills.map((p) => (
        <button
          key={p.key}
          type="button"
          disabled={!pick}
          onClick={() => pick?.(p.key)}
          className={`flex min-w-[9rem] shrink-0 flex-col justify-center rounded-xl border px-3 py-2.5 text-left text-xs shadow-sm ${cardInteractive} ${p.className} ${
            isSel(p.key) ? "ring-2 ring-[#026f17]/35 ring-offset-1" : ""
          } ${pick ? "" : "cursor-default"}`}
        >
          <span className="font-semibold uppercase tracking-wide opacity-90">{p.label}</span>
          <span className="text-lg font-bold tabular-nums leading-tight">{p.value}</span>
        </button>
      ))}
    </div>
  );
}
