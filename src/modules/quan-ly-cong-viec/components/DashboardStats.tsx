"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";

interface Props {
  tasks: any[];
}

export function DashboardStats({ tasks }: Props) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.trang_thai === "HOAN_THANH").length;
    const inProgress = tasks.filter((t) => {
      if (t.trang_thai === "QUA_HAN") return true;
      if (t.trang_thai !== "DANG_THUC_HIEN") return false;
      const pct = Number(t.phan_tram_hoan_thanh ?? 0);
      return pct < 100;
    }).length;
    
    // Tính toán việc quá hạn: Trang thái QUA_HAN hoặc (Chưa xong & Hạn chót < Hôm nay)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTasks = tasks.filter((t) => {
      if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return false;
      if (t.trang_thai === "QUA_HAN") return true;
      if (t.han_hoan_thanh) {
        return new Date(t.han_hoan_thanh) < today;
      }
      return false;
    });

    const gateDeXuat = tasks.filter((t) => isDeXuatChoDuyet(t)).length;
    const gateNhan = tasks.filter((t) => isChoNhanViec(t)).length;
    const gateNghiemThu = tasks.filter((t) => isChoNghiemThuHoanThanh(t)).length;

    const nearDeadline = tasks.filter((t) => {
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
      overdueCount: overdueTasks.length,
      overdueTasks,
      gateDeXuat,
      gateNhan,
      gateNghiemThu,
      nearDeadline,
    };
  }, [tasks]);

  const cards = [
    { label: "Tổng công việc", value: stats.total, icon: ListTodo, color: "text-slate-800", bg: "bg-white", border: "border-slate-200" },
    { label: "Đang thực hiện", value: stats.inProgress, icon: Clock, color: "text-blue-600", bg: "bg-white", border: "border-slate-200" },
    { label: "Đã hoàn thành", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-white", border: "border-slate-200" },
    { label: "Việc quá hạn", value: stats.overdueCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  ];

  if (!tasks || tasks.length === 0) return null;

  const gatePills: { key: string; label: string; value: number; className: string }[] = [];
  if (stats.gateDeXuat > 0) {
    gatePills.push({
      key: "dexuat",
      label: "Chờ phê đề xuất",
      value: stats.gateDeXuat,
      className: "border-violet-100 bg-violet-50/80 text-violet-900",
    });
  }
  if (stats.gateNhan > 0) {
    gatePills.push({
      key: "nhan",
      label: "Chờ nhận việc",
      value: stats.gateNhan,
      className: "border-sky-100 bg-sky-50/80 text-sky-900",
    });
  }
  if (stats.gateNghiemThu > 0) {
    gatePills.push({
      key: "nghiemthu",
      label: "Chờ nghiệm thu",
      value: stats.gateNghiemThu,
      className: "border-orange-100 bg-orange-50/80 text-orange-900",
    });
  }
  if (stats.nearDeadline > 0) {
    gatePills.push({
      key: "near",
      label: "Sắp đến hạn (≤2 ngày)",
      value: stats.nearDeadline,
      className: "border-amber-100 bg-amber-50/80 text-amber-950",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`flex min-w-[9.5rem] shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm ${card.border} ${card.bg}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${card.bg === "bg-white" ? "bg-slate-50" : "bg-white"} ${card.color}`}
            >
              <card.icon size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`text-xl font-bold leading-tight ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
        {gatePills.map((p) => (
          <div
            key={p.key}
            className={`flex min-w-[9rem] shrink-0 flex-col justify-center rounded-xl border px-3 py-2.5 text-xs shadow-sm ${p.className}`}
          >
            <span className="font-semibold uppercase tracking-wide opacity-90">{p.label}</span>
            <span className="text-lg font-bold tabular-nums leading-tight">{p.value}</span>
          </div>
        ))}
      </div>

      {stats.overdueTasks.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Cần xử lý gấp ({stats.overdueCount})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.overdueTasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-1 p-4 bg-red-50/50 rounded-xl border border-red-100/50 hover:bg-red-50 transition-colors">
                <span className="text-sm font-semibold text-slate-800 line-clamp-1" title={task.tieu_de}>{task.tieu_de}</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">{task.nguoi_phu_trach_ten || "Chưa phân công"}</span>
                  <span className="text-xs font-bold text-red-500">
                    {new Date(task.han_hoan_thanh).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
