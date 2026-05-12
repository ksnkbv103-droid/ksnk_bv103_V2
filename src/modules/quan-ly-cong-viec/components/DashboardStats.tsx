"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";

interface Props {
  tasks: any[];
}

export function DashboardStats({ tasks }: Props) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.trang_thai === "HOAN_THANH").length;
    const inProgress = tasks.filter((t) => t.trang_thai === "DANG_THUC_HIEN").length;
    
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

    return {
      total,
      completed,
      inProgress,
      overdueCount: overdueTasks.length,
      overdueTasks,
    };
  }, [tasks]);

  const cards = [
    { label: "Tổng công việc", value: stats.total, icon: ListTodo, color: "text-slate-800", bg: "bg-white", border: "border-slate-200" },
    { label: "Đang thực hiện", value: stats.inProgress, icon: Clock, color: "text-blue-600", bg: "bg-white", border: "border-slate-200" },
    { label: "Đã hoàn thành", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-white", border: "border-slate-200" },
    { label: "Việc quá hạn", value: stats.overdueCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  ];

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className={`flex items-center gap-4 p-5 rounded-2xl border ${card.border} ${card.bg} shadow-sm transition-all hover:shadow-md`}>
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${card.bg === 'bg-white' ? 'bg-slate-50' : 'bg-white'} ${card.color}`}>
              <card.icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
              <h4 className={`text-2xl font-bold ${card.color}`}>{card.value}</h4>
            </div>
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
