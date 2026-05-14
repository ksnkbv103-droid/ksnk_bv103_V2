"use client";

import React from "react";
import { Clock, ChevronRight, ListTree } from "lucide-react";
import {
  isChoNghiemThuHoanThanh,
  isChoNhanViec,
  isDeXuatChoDuyet,
} from "../lib/qlcv-workflow-display";

interface Task {
  id: string;
  tieu_de: string;
  trang_thai: string;
  muc_do_uu_tien: string;
  nguoi_phu_trach_ten?: string;
  nguoi_phu_trach_id?: string | null;
  is_active?: boolean | null;
  to_cong_tac_ten?: string;
  phan_tram_hoan_thanh: number;
  cong_viec_con_count?: number;
}

type KanbanColId = "DE_XUAT" | "BACKLOG" | "DOING" | "CHO_NGHIEM_THU" | "CLOSED";

interface Props {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  actorStaffId?: string | null;
  onNhanNhiemVu?: (taskId: string) => void | Promise<void>;
  /** Hiện cột «Đề xuất chờ duyệt» (tách khỏi hàng đợi). */
  showProposalColumn?: boolean;
}

function bucketFor(t: Task, showProposalColumn: boolean): KanbanColId {
  if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return "CLOSED";
  if (isChoNghiemThuHoanThanh(t)) return "CHO_NGHIEM_THU";
  if (t.trang_thai === "DANG_THUC_HIEN" || t.trang_thai === "QUA_HAN") return "DOING";
  if (isDeXuatChoDuyet(t)) return showProposalColumn ? "DE_XUAT" : "BACKLOG";
  if (isChoNhanViec(t) || t.trang_thai === "CHUA_BAT_DAU") return "BACKLOG";
  return "BACKLOG";
}

function flowLine(t: Task) {
  if (isDeXuatChoDuyet(t)) return "Đề xuất chờ duyệt";
  if (isChoNhanViec(t)) return "Chờ nhận việc";
  if (isChoNghiemThuHoanThanh(t)) return "Chờ nghiệm thu";
  return t.trang_thai?.replace(/_/g, " ");
}

export default function CongViecKanban({
  tasks,
  onTaskClick,
  actorStaffId,
  onNhanNhiemVu,
  showProposalColumn = false,
}: Props) {
  const columns: { id: KanbanColId; title: string; dot: string }[] = [
    ...(showProposalColumn
      ? [{ id: "DE_XUAT" as const, title: "Đề xuất chờ duyệt", dot: "bg-violet-500" }]
      : []),
    { id: "BACKLOG", title: "Chờ nhận việc", dot: "bg-slate-400" },
    { id: "DOING", title: "Đang thực hiện", dot: "bg-blue-500" },
    { id: "CHO_NGHIEM_THU", title: "Chờ nghiệm thu", dot: "bg-amber-500" },
    { id: "CLOSED", title: "Đã hoàn thành / Hủy", dot: "bg-emerald-500" },
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
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-4 min-h-[520px] snap-x snap-mandatory sm:gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => bucketFor(t, showProposalColumn) === col.id);

        return (
          <div
            key={col.id}
            className="flex min-w-0 flex-col w-[min(92vw,300px)] shrink-0 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] snap-center sm:w-[280px] md:p-4 lg:w-[300px]"
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${col.dot}`} />
                <h3 className="truncate text-[11px] font-black uppercase tracking-widest text-slate-600">
                  {col.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                {colTasks.length}
              </span>
            </div>

            <div className="scrollbar-hide flex max-h-[min(68vh,640px)] flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
              {colTasks.map((task) => {
                const showNhan =
                  Boolean(onNhanNhiemVu) &&
                  isChoNhanViec(task) &&
                  Boolean(actorStaffId) &&
                  String(task.nguoi_phu_trach_id || "") === String(actorStaffId);

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
                    className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm outline-none transition-all hover:border-[#026f17]/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${getPriorityStyle(task.muc_do_uu_tien)}`}
                      >
                        {task.muc_do_uu_tien}
                      </span>
                      <div className="shrink-0 rounded-full bg-slate-50 p-1 text-slate-300">
                        <ChevronRight size={14} aria-hidden />
                      </div>
                    </div>

                    <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{flowLine(task)}</p>

                    <h4 className="mb-2 line-clamp-2 text-sm font-black leading-tight text-slate-800">{task.tieu_de}</h4>

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase text-slate-300">Phụ trách / Tổ</span>
                        <p className="truncate text-[10px] font-black text-slate-600">
                          {task.nguoi_phu_trach_ten || "Chưa phân công"}
                          {task.to_cong_tac_ten ? ` · ${task.to_cong_tac_ten}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                        <div className="flex items-center gap-1 text-slate-400" title="Công việc con">
                          <ListTree size={12} aria-hidden />
                          <span className="text-[10px] font-black">{task.cong_viec_con_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-[#026f17]" aria-hidden />
                          <span className="text-[10px] font-black text-[#026f17]">{task.phan_tram_hoan_thanh || 0}%</span>
                        </div>
                      </div>
                    </div>

                    {showNhan ? (
                      <button
                        type="button"
                        className="bv103-control-h mt-2.5 w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-[10px] font-black uppercase tracking-widest text-blue-800 hover:bg-blue-100"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await onNhanNhiemVu?.(task.id);
                        }}
                      >
                        Nhận nhiệm vụ
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
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
