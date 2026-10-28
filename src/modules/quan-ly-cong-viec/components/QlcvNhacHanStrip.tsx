"use client";

import React, { useMemo } from "react";
import { countQlcvNhacHan, isNhacHanCountReliable } from "../lib/qlcv-nhac-han";
import type { QlcvBoardFilter } from "../lib/qlcv-board-filter";

type Props = {
  tasks: ReadonlyArray<Record<string, unknown>>;
  actorStaffId: string | null;
  activeFilter: QlcvBoardFilter | null;
  onFilterChange: (f: QlcvBoardFilter) => void;
};

const linkCls = "font-semibold underline underline-offset-2 touch-manipulation hover:text-amber-950";

/** Dải nhắc việc của tôi: đếm client-side từ danh sách board đã tải. */
export function QlcvNhacHanStrip({ tasks, actorStaffId, activeFilter, onFilterChange }: Props) {
  const { quaHan, homNay } = useMemo(() => countQlcvNhacHan(tasks, actorStaffId), [tasks, actorStaffId]);
  // Lens OVERDUE / IN_PROGRESS đã cắt danh sách ở SQL → số đếm không đủ, ẩn thay vì hiện sai.
  if (!actorStaffId || !isNhacHanCountReliable(activeFilter) || (quaHan === 0 && homNay === 0)) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      <span>Bạn có</span>
      {quaHan > 0 ? (
        <button type="button" className={linkCls} onClick={() => onFilterChange("MY_TASKS")} title="Mở danh sách việc của tôi (đang mở)">
          {quaHan} việc quá hạn
        </button>
      ) : null}
      {quaHan > 0 && homNay > 0 ? <span>và</span> : null}
      {homNay > 0 ? (
        <button type="button" className={linkCls} onClick={() => onFilterChange("HOM_NAY")}>
          {homNay} việc đến hạn hôm nay
        </button>
      ) : null}
    </div>
  );
}
