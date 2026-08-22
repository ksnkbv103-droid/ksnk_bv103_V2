"use client";

import React, { useMemo } from "react";
import { AlertTriangle, Clock, UserRound, Inbox } from "lucide-react";
import { isBoardLaneDangLam, isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isMyQlcvTask, isQlcvChoToiDuyet, type QlcvBoardFilter } from "../lib/qlcv-board-filter";
import type { CongViecView } from "../types";

interface Props {
  tasks: CongViecView[];
  activeFilter?: QlcvBoardFilter | null;
  onFilterChange?: (filter: QlcvBoardFilter) => void;
  showAllGatePills?: boolean;
  actorStaffId?: string | null;
}

const chipBase =
  "inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-semibold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1";

export function QlcvGateStats({ tasks, activeFilter, onFilterChange, actorStaffId }: Props) {
  const list = tasks ?? [];

  const stats = useMemo(() => {
    const myTasks = actorStaffId
      ? list.filter((t) => isMyQlcvTask(t as unknown as Record<string, unknown>, actorStaffId)).length
      : 0;
    const inProgress = list.filter((t) => isBoardLaneDangLam(t)).length;
    const overdueCount = list.filter((t) => isBoardLaneQuaHan(t)).length;
    const choToi = list.filter((t) => isQlcvChoToiDuyet(t as unknown as Record<string, unknown>)).length;
    return { myTasks, inProgress, overdueCount, choToi };
  }, [list, actorStaffId]);

  const pick = onFilterChange;
  const isSel = (f: QlcvBoardFilter) => activeFilter === f;

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

  return (
    <div className="scrollbar-hide flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1">
      {actorStaffId
        ? chip(
            "MY_TASKS",
            "Của tôi",
            stats.myTasks,
            <UserRound size={14} className="text-sky-600" />,
            "border-sky-200 bg-sky-50/80",
          )
        : null}
      {chip("IN_PROGRESS", "Cần làm", stats.inProgress, <Clock size={14} className="text-blue-600" />, "border-slate-200 bg-white")}
      {chip(
        "OVERDUE",
        "Quá hạn",
        stats.overdueCount,
        <AlertTriangle size={14} className="text-red-600" />,
        "border-red-200 bg-red-50",
      )}
      {chip(
        "GATE_CHO_TOI",
        "Chờ tôi",
        stats.choToi,
        <Inbox size={14} className="text-violet-600" />,
        "border-violet-200 bg-violet-50/80",
      )}
    </div>
  );
}
