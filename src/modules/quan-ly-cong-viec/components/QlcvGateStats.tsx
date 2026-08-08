"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, UserRound } from "lucide-react";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { isBoardLaneDangLam, isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isMyQlcvTask, type QlcvBoardFilter } from "../lib/qlcv-board-filter";
import type { CongViecView } from "../types";

interface Props {
  tasks: CongViecView[];
  activeFilter?: QlcvBoardFilter | null;
  onFilterChange?: (filter: QlcvBoardFilter) => void;
  /** Luôn hiện 3 cổng (kể cả 0) — cho người phê duyệt / điều hành. */
  showAllGatePills?: boolean;
  actorStaffId?: string | null;
}

const chipBase =
  "inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-semibold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1";

export function QlcvGateStats({ tasks, activeFilter, onFilterChange, showAllGatePills, actorStaffId }: Props) {
  const list = tasks ?? [];

  const stats = useMemo(() => {
    const total = list.length;
    const completed = list.filter((t) => normalizeQlcvTrangThaiToCanonical(t.trang_thai) === "HOAN_THANH").length;
    const inProgress = list.filter((t) => isBoardLaneDangLam(t)).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = list.filter((t) => isBoardLaneQuaHan(t)).length;

    const gateDeXuat = list.filter((t) => isDeXuatChoDuyet(t)).length;
    const gateNghiemThu = list.filter((t) => isChoNghiemThuHoanThanh(t)).length;

    const nearDeadline = list.filter((t) => {
      if (!t.han_hoan_thanh) return false;
      const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
      if (st === "HOAN_THANH" || st === "DA_HUY") return false;
      const d = new Date(t.han_hoan_thanh);
      d.setHours(0, 0, 0, 0);
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 2;
    }).length;

    const myTasks = actorStaffId
      ? list.filter((t) => isMyQlcvTask(t as unknown as Record<string, unknown>, actorStaffId)).length
      : 0;

    return {
      total,
      completed,
      inProgress,
      overdueCount,
      gateDeXuat,
      gateNghiemThu,
      nearDeadline,
      myTasks,
    };
  }, [list, actorStaffId]);

  const pick = onFilterChange;
  const isSel = (f: QlcvBoardFilter) => (f === "TOTAL" && (activeFilter == null || activeFilter === "TOTAL")) || activeFilter === f;

  const chip = (
    f: QlcvBoardFilter,
    label: string,
    value: number,
    icon: React.ReactNode,
    className: string,
  ) => (
    <button
      type="button"
      key={f}
      disabled={!pick}
      onClick={() => pick?.(f)}
      className={`${chipBase} ${className} ${
        isSel(f) ? "ring-2 ring-[var(--primary)]/40 ring-offset-1" : ""
      } ${pick ? "hover:bg-white/80 active:scale-[0.99]" : "cursor-default opacity-95"}`}
    >
      {icon}
      <span className="whitespace-nowrap text-slate-600">{label}</span>
      <span className="tabular-nums text-slate-900">{value}</span>
    </button>
  );

  const gateDefs: { key: QlcvBoardFilter; label: string; value: number; className: string }[] = [
    {
      key: "GATE_DEXUAT",
      label: "Chờ phê đề xuất",
      value: stats.gateDeXuat,
      className: "border-violet-200 bg-violet-50/80 text-violet-900",
    },
    {
      key: "GATE_NGHIEMTHU",
      label: "Chờ nghiệm thu",
      value: stats.gateNghiemThu,
      className: "border-orange-200 bg-orange-50/80 text-orange-900",
    },
  ];

  const gatePills = showAllGatePills ? gateDefs : gateDefs.filter((p) => p.value > 0);

  if (stats.nearDeadline > 0 || showAllGatePills) {
    gatePills.push({
      key: "NEAR_DEADLINE",
      label: "Sắp đến hạn",
      value: stats.nearDeadline,
      className: "border-amber-200 bg-amber-50/80 text-amber-950",
    });
  }

  return (
    <div className="scrollbar-hide flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1">
      {chip("TOTAL", "Tổng", stats.total, <ListTodo size={14} className="text-slate-500" />, "border-slate-200 bg-white")}
      {actorStaffId
        ? chip(
            "MY_TASKS",
            "Của tôi",
            stats.myTasks,
            <UserRound size={14} className="text-sky-600" />,
            "border-sky-200 bg-sky-50/80",
          )
        : null}
      {chip("IN_PROGRESS", "Đang làm", stats.inProgress, <Clock size={14} className="text-blue-600" />, "border-slate-200 bg-white")}
      {chip(
        "COMPLETED",
        "Hoàn thành",
        stats.completed,
        <CheckCircle2 size={14} className="text-emerald-600" />,
        "border-slate-200 bg-white",
      )}
      {chip(
        "OVERDUE",
        "Gấp",
        stats.overdueCount,
        <AlertTriangle size={14} className="text-red-600" />,
        "border-red-200 bg-red-50",
      )}
      {gatePills.map((p) =>
        chip(p.key, p.label, p.value, null, p.className),
      )}
    </div>
  );
}
