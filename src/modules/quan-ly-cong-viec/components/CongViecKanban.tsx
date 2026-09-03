"use client";

import React, { useEffect, useRef } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { formatMucDoUuTienLabel, getCongViecTrangThaiLabel } from "../lib/qlcv-labels";
import { getKanbanColumnIdForTask, isQlcvBoardOverdue, type KanbanColumnId } from "../lib/qlcv-board-lanes";
import { qlcvKanbanCardAttentionClass } from "../lib/qlcv-ux-chrome";
import type { CongViecView } from "../types";
import { QlcvDinhKyMauChip } from "./QlcvDinhKyMauChip";

type KanbanColId = KanbanColumnId;

interface Props {
  tasks: CongViecView[];
  onTaskClick?: (task: CongViecView) => void;
  /** Hiện cột «Đề xuất chờ duyệt» (tách khỏi hàng đợi). */
  showProposalColumn?: boolean;
  /** Cuộn tới cột tương ứng khi người dùng chọn thẻ thống kê (kèm `focusNonce` đổi mỗi lần bấm). */
  focusColumnId?: KanbanColumnId | null;
  focusNonce?: number;
}

/** Ẩn dòng trạng thái khi trùng ý nghĩa với tiêu đề cột Kanban. */
function showKanbanCardSubtitle(colId: KanbanColId, t: CongViecView, showProposalColumn: boolean): boolean {
  const logicalCol = getKanbanColumnIdForTask(t, showProposalColumn);
  if (logicalCol !== colId) return true;
  if (colId === "DE_XUAT" && isDeXuatChoDuyet(t)) return false;
  if (colId === "CHO_DUYET" && isChoNghiemThuHoanThanh(t)) return false;
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  if (colId === "DANG_LAM" && (st === "DANG_LAM" || st === "TU_CHOI")) return false;
  if (colId === "HOAN_THANH" || colId === "DA_HUY") return false;
  return true;
}

export default function CongViecKanban({
  tasks,
  onTaskClick,
  showProposalColumn = false,
  focusColumnId = null,
  focusNonce = 0,
}: Props) {
  const columnEls = useRef<Partial<Record<KanbanColId, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!focusNonce) return;
    const id = focusColumnId;
    if (!id) return;
    const el = columnEls.current[id];
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }, [focusNonce, focusColumnId]);

  const columns: { id: KanbanColId; title: string; dot: string }[] = [
    ...(showProposalColumn
      ? [{ id: "DE_XUAT" as const, title: "Đề xuất chờ duyệt", dot: "bg-violet-500" }]
      : []),
    { id: "DANG_LAM", title: "Đang thực hiện", dot: "bg-blue-500" },
    { id: "CHO_DUYET", title: "Chờ nghiệm thu", dot: "bg-amber-500" },
    { id: "HOAN_THANH", title: "Hoàn thành", dot: "bg-emerald-500" },
    { id: "DA_HUY", title: "Đã hủy", dot: "bg-slate-500" },
  ];

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "CAO":
        return "text-red-600 bg-red-50";
      case "TRUNG_BINH":
        return "text-amber-600 bg-amber-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-4 min-h-[min(520px,72dvh)] snap-x snap-mandatory touch-manipulation sm:gap-4 sm:min-h-[520px]">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => getKanbanColumnIdForTask(t, showProposalColumn) === col.id);

        return (
          <div
            key={col.id}
            ref={(node) => {
              if (node) columnEls.current[col.id] = node;
              else delete columnEls.current[col.id];
            }}
            className="flex min-w-0 flex-col w-[min(88vw,300px)] shrink-0 rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50/90 p-3 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] snap-center sm:w-[280px] md:p-4 lg:w-[300px]"
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${col.dot}`} />
                <h3 className="truncate text-[11px] font-medium text-slate-500">
                  {col.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {colTasks.length}
              </span>
            </div>

            <div className="scrollbar-hide flex max-h-[min(68vh,640px)] flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
              {colTasks.map((task) => {
                const showSubtitle = showKanbanCardSubtitle(col.id, task, showProposalColumn);

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTaskClick?.(task);
                      }
                    }}
                    className={`cursor-pointer rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-3.5 shadow-sm outline-none transition-all hover:border-[var(--primary)]/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 touch-manipulation active:scale-[0.99] sm:p-4 ${qlcvKanbanCardAttentionClass(task)}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold normal-case ${getPriorityStyle(task.muc_do_uu_tien)}`}
                      >
                        {formatMucDoUuTienLabel(task.muc_do_uu_tien)}
                      </span>
                      <div className="shrink-0 rounded-full bg-slate-50 p-1 text-slate-300">
                        <ChevronRight size={14} aria-hidden />
                      </div>
                    </div>

                    {showSubtitle ? (
                      <p className="mb-1 text-[11px] font-medium normal-case leading-snug text-slate-500">
                        {getCongViecTrangThaiLabel(task)}
                      </p>
                    ) : null}

                    {isQlcvBoardOverdue(task) ? (
                      <p className="mb-1 text-[11px] font-semibold text-red-700">Quá hạn</p>
                    ) : null}
                    <h4 className="mb-1 line-clamp-2 text-sm font-semibold leading-tight text-slate-800">{task.tieu_de}</h4>
                    <div className="mb-2">
                      <QlcvDinhKyMauChip loaiCongViec={task.loai_cong_viec} dinhKyMauId={task.dinh_ky_mau_id} />
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-slate-400">Phụ trách / Tổ</span>
                        <p className="truncate text-[11px] font-semibold text-slate-600">
                          {task.nguoi_phu_trach_ten || "Chưa phân công"}
                          {task.to_cong_tac_ten ? ` · ${task.to_cong_tac_ten}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Clock size={12} className="text-[var(--primary)]" aria-hidden />
                        <span className="text-[11px] font-mono text-[11px] font-medium text-[var(--primary)]">{task.phan_tram_hoan_thanh || 0}%</span>
                      </div>
                    </div>

                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="rounded-[var(--radius-shell)] border-2 border-dashed border-slate-200 py-8 text-center text-[11px] font-medium text-slate-400">
                  Trống
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
