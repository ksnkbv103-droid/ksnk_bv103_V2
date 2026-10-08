"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, UserRound, Inbox } from "lucide-react";
import { isBoardLaneDangLam, isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isMyQlcvTask, isQlcvChoToiDuyet, type QlcvBoardFilter } from "../lib/qlcv-board-filter";
import {
  getQlcvBoardCounts,
  type QlcvBoardGateCounts,
} from "../actions/cong-viec-read.actions";
import type { CongViecView } from "../types";
import { computeQlcvMvpStats } from "../lib/qlcv-mvp-stats";

interface Props {
  /** Fallback when RPC fails — prefer `rpc_qlcv_board_counts` (global SSOT). */
  tasks?: CongViecView[];
  activeFilter?: QlcvBoardFilter | null;
  onFilterChange?: (filter: QlcvBoardFilter) => void;
  actorStaffId?: string | null;
  /** Bump after create/edit/delete so counts refetch (client-fetched). */
  refreshKey?: number;
}

const chipBase =
  "inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-semibold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1";

const EMPTY: QlcvBoardGateCounts = { myTasks: 0, inProgress: 0, overdue: 0, choToi: 0 };

export function QlcvGateStats({
  tasks,
  activeFilter,
  onFilterChange,
  actorStaffId,
  refreshKey = 0,
}: Props) {
  const list = tasks ?? [];
  const [rpcCounts, setRpcCounts] = useState<QlcvBoardGateCounts | null>(null);

  const clientFallback = useMemo((): QlcvBoardGateCounts => {
    const myTasks = actorStaffId
      ? list.filter((t) => isMyQlcvTask(t as unknown as Record<string, unknown>, actorStaffId)).length
      : 0;
    const inProgress = list.filter((t) => isBoardLaneDangLam(t)).length;
    const overdue = list.filter((t) => isBoardLaneQuaHan(t)).length;
    const choToi = actorStaffId
      ? list.filter((t) =>
          isQlcvChoToiDuyet(t as unknown as Record<string, unknown>, actorStaffId),
        ).length
      : 0;
    return { myTasks, inProgress, overdue, choToi };
  }, [list, actorStaffId]);

  /** Domain A MVP: client-side from loaded rows (RPC board_counts insufficient). */
  const mvp = useMemo(() => computeQlcvMvpStats(list), [list]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await getQlcvBoardCounts(actorStaffId ?? null);
        if (!cancelled) setRpcCounts(next);
      } catch (err) {
        console.error("rpc_qlcv_board_counts failed; using client slice fallback", err);
        if (!cancelled) setRpcCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actorStaffId, refreshKey]);

  // Prefer global RPC SSOT; client slice only if RPC unavailable.
  const stats = rpcCounts ?? (list.length > 0 ? clientFallback : EMPTY);

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
    <div className="flex min-w-0 flex-col gap-1.5">
    <div
      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-700"
      title="Số việc, % hoàn thành và % quá hạn tính trên bảng đang xem. Chip đếm bên dưới là toàn viện."
    >
      <span>
        <span className="font-medium text-slate-500">Số việc</span>{" "}
        <strong className="tabular-nums text-slate-900">{mvp.tong}</strong>
      </span>
      <span className="text-slate-300">·</span>
      <span>
        <span className="font-medium text-slate-500">% hoàn thành (bảng đang xem)</span>{" "}
        <strong className="tabular-nums text-emerald-700">
          {mvp.pctHoanThanh == null ? "—" : `${mvp.pctHoanThanh}%`}
        </strong>
      </span>
      <span className="text-slate-300">·</span>
      <span>
        <span className="font-medium text-slate-500">% quá hạn (bảng đang xem)</span>{" "}
        <strong className="tabular-nums text-red-700">
          {mvp.pctQuaHan == null ? "—" : `${mvp.pctQuaHan}%`}
        </strong>
      </span>
    </div>
    <p className="bv103-type-label text-[11px] font-medium text-slate-500">Chip đếm: toàn viện</p>
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
        stats.overdue,
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
    </div>
  );
}