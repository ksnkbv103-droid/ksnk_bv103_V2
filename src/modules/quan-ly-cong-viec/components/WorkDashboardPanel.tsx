"use client";

import React, { useMemo } from "react";
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Users, Target } from "lucide-react";

interface Props {
  tasks: any[];
  loading: boolean;
  type: "network-work" | "ksnk-work";
}

export default function WorkDashboardPanel({ tasks, loading, type }: Props) {
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, inProgress: 0, completed: 0, overdue: 0, rate: 0, staff: [], network: [] };
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.trang_thai === "HOAN_THANH").length;
    const inProgress = tasks.filter(t => t.trang_thai === "DANG_THUC_HIEN").length;
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdue = tasks.filter(t => {
      if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return false;
      if (t.trang_thai === "QUA_HAN") return true;
      return t.han_hoan_thanh && new Date(t.han_hoan_thanh) < today;
    }).length;

    // Staff ranking
    const staffMap: any = {};
    tasks.forEach(t => {
      const name = t.nguoi_phu_trach_ten || "Chưa phân công";
      if (!staffMap[name]) staffMap[name] = { name, total: 0, completed: 0 };
      staffMap[name].total++;
      if (t.trang_thai === "HOAN_THANH") staffMap[name].completed++;
    });

    return {
      total,
      inProgress,
      completed,
      overdue,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      staff: Object.values(staffMap).sort((a: any, b: any) => b.total - a.total).slice(0, 5)
    };
  }, [tasks]);

  if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse">Đang tải dữ liệu công việc...</div>;

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng nhiệm vụ", value: stats.total, icon: ListTodo, color: "text-slate-600", bg: "bg-white" },
          { label: "Đang thực hiện", value: stats.inProgress, icon: Clock, color: "text-blue-600", bg: "bg-blue-50/30" },
          { label: "Đã hoàn thành", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50/30" },
          { label: "Quá hạn/Gấp", value: stats.overdue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50/30" },
        ].map((card, i) => (
          <div key={i} className={`p-4 rounded-2xl border border-slate-200 ${card.bg} shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-white shadow-sm ${card.color}`}>
                <card.icon size={18} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
              {card.label === "Đã hoàn thành" && stats.total > 0 && (
                <span className="text-[10px] font-black text-emerald-500">({stats.rate}%)</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart (Simplified) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <Target size={18} className="text-blue-600" />
            <h3 className="text-sm font-black uppercase tracking-tight">Tiến độ tổng thể</h3>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="url(#blueGradient)" strokeWidth="12" 
                  strokeDasharray={440} strokeDashoffset={440 - (440 * stats.rate) / 100} strokeLinecap="round" />
                <defs>
                  <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800">{stats.rate}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hoàn thành</span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff / Department Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <Users size={18} className="text-[#026f17]" />
            <h3 className="text-sm font-black uppercase tracking-tight">Tỉ lệ hoàn thành theo nhân sự</h3>
          </div>
          <div className="space-y-4">
            {stats.staff.map((s: any, i: number) => {
              const r = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{s.completed}/{s.total} Việc</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#026f17] transition-all duration-500" style={{ width: `${r}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
