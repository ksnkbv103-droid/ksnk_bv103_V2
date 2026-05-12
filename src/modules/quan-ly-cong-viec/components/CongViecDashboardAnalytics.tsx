"use client";

import React, { useMemo } from "react";
import { CheckCircle2, AlertTriangle, Clock, Target, UserCheck } from "lucide-react";

interface Props {
  tasks: any[];
}

export function CongViecDashboardAnalytics({ tasks }: Props) {
  const analytics = useMemo(() => {
    // 1. Phân loại theo phạm vi
    const noiBoTasks = tasks.filter((t) => t.loai_pham_vi === "NOI_BO");
    const mangLuoiTasks = tasks.filter((t) => t.loai_pham_vi === "MANG_LUOI");

    // 2. Hàm tính toán chung
    const getStats = (taskList: any[]) => {
      const total = taskList.length;
      if (total === 0) return { total: 0, completed: 0, inProgress: 0, overdue: 0, rate: 0 };
      
      const completed = taskList.filter((t) => t.trang_thai === "HOAN_THANH").length;
      const inProgress = taskList.filter((t) => t.trang_thai === "DANG_THUC_HIEN").length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = taskList.filter((t) => {
        if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return false;
        if (t.trang_thai === "QUA_HAN") return true;
        return t.han_hoan_thanh && new Date(t.han_hoan_thanh) < today;
      }).length;

      return { total, completed, inProgress, overdue, rate: Math.round((completed / total) * 100) };
    };

    // 3. Phân tích nhân sự (Nội bộ)
    const staffStats = noiBoTasks.reduce((acc: any, task) => {
      const name = task.nguoi_phu_trach_ten || "Chưa phân công";
      if (!acc[name]) {
        acc[name] = { name, total: 0, completed: 0, overdue: 0 };
      }
      acc[name].total += 1;
      if (task.trang_thai === "HOAN_THANH") acc[name].completed += 1;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = task.trang_thai === "QUA_HAN" || (task.trang_thai !== "HOAN_THANH" && task.han_hoan_thanh && new Date(task.han_hoan_thanh) < today);
      if (isOverdue) acc[name].overdue += 1;
      
      return acc;
    }, {});

    const sortedStaff = Object.values(staffStats).sort((a: any, b: any) => b.total - a.total);

    // 4. Phân tích khoa phòng mạng lưới
    const networkStats = mangLuoiTasks.reduce((acc: any, task) => {
      const khoa = task.khoa?.ten_khoa || task.nguoi_phu_trach_ten || "Mạng lưới chung";
      if (!acc[khoa]) {
        acc[khoa] = { name: khoa, total: 0, completed: 0 };
      }
      acc[khoa].total += 1;
      if (task.trang_thai === "HOAN_THANH") acc[khoa].completed += 1;
      return acc;
    }, {});

    const sortedNetwork = Object.values(networkStats).sort((a: any, b: any) => b.total - a.total);

    return {
      noiBo: getStats(noiBoTasks),
      mangLuoi: getStats(mangLuoiTasks),
      staff: sortedStaff,
      network: sortedNetwork,
    };
  }, [tasks]);

  if (!tasks || tasks.length === 0) {
    return <div className="text-center p-8 text-slate-400">Chưa có dữ liệu để phân tích</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Khối Nội bộ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hiệu suất Nội bộ Khoa</h3>
            <span className="px-3 py-1 bg-[#026f17]/10 text-[#026f17] text-xs font-bold rounded-lg">{analytics.noiBo.rate}% Hoàn thành</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Tổng việc</p>
              <p className="text-2xl font-bold text-slate-800">{analytics.noiBo.total}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl">
              <p className="text-xs text-emerald-600 mb-1">Đã xong</p>
              <p className="text-2xl font-bold text-emerald-700">{analytics.noiBo.completed}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl">
              <p className="text-xs text-red-600 mb-1">Trễ hạn</p>
              <p className="text-2xl font-bold text-red-700">{analytics.noiBo.overdue}</p>
            </div>
          </div>
        </div>

        {/* Khối Mạng lưới */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hiệu suất Mạng Lưới KSNK</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">{analytics.mangLuoi.rate}% Hoàn thành</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Tổng việc</p>
              <p className="text-2xl font-bold text-slate-800">{analytics.mangLuoi.total}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl">
              <p className="text-xs text-emerald-600 mb-1">Đã xong</p>
              <p className="text-2xl font-bold text-emerald-700">{analytics.mangLuoi.completed}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl">
              <p className="text-xs text-red-600 mb-1">Trễ hạn</p>
              <p className="text-2xl font-bold text-red-700">{analytics.mangLuoi.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Xếp hạng Nhân sự Nội bộ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck size={18} className="text-[#026f17]" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Phân bổ & Tỉ lệ hoàn thành (Nội bộ)</h3>
          </div>
          <div className="space-y-4">
            {analytics.staff.map((s: any, idx: number) => {
              const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                    <div className="text-xs text-slate-500">
                      <span className="text-emerald-600 font-bold">{s.completed}</span> / {s.total} việc 
                      {s.overdue > 0 && <span className="text-red-500 ml-2">({s.overdue} trễ)</span>}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${rate}%` }} />
                    <div className="h-full bg-slate-300" style={{ width: `${100 - rate}%` }} />
                  </div>
                </div>
              );
            })}
            {analytics.staff.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu phân công nội bộ.</p>}
          </div>
        </div>

        {/* Thống kê Mạng lưới */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Target size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tình hình báo cáo Mạng lưới</h3>
          </div>
          <div className="space-y-4">
            {analytics.network.map((n: any, idx: number) => {
              const rate = n.total > 0 ? Math.round((n.completed / n.total) * 100) : 0;
              return (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-slate-700">{n.name}</span>
                    <div className="text-xs text-slate-500">
                      <span className="text-emerald-600 font-bold">{n.completed}</span> / {n.total} báo cáo
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: `${rate}%` }} />
                    <div className="h-full bg-slate-300" style={{ width: `${100 - rate}%` }} />
                  </div>
                </div>
              );
            })}
            {analytics.network.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu từ mạng lưới.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
