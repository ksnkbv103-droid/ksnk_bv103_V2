"use client";

import React, { useMemo } from "react";
import { UserCheck, ClipboardList, Timer, Ban } from "lucide-react";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";

interface Props {
  tasks: any[];
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function CongViecDashboardAnalytics({ tasks }: Props) {
  const analytics = useMemo(() => {
    const list = tasks || [];
    const total = list.length;
    const cancelled = list.filter((t) => t.trang_thai === "DA_HUY").length;
    const completed = list.filter((t) => t.trang_thai === "HOAN_THANH").length;

    const gate1 = list.filter((t) => isDeXuatChoDuyet(t)).length;
    const gate2 = list.filter((t) => isChoNhanViec(t)).length;
    const gate3 = list.filter((t) => isChoNghiemThuHoanThanh(t)).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueOpen = list.filter((t) => {
      if (t.trang_thai === "HOAN_THANH" || t.trang_thai === "DA_HUY") return false;
      if (t.trang_thai === "QUA_HAN") return true;
      return t.han_hoan_thanh && new Date(t.han_hoan_thanh) < today;
    }).length;

    const doneWithHan = list.filter((t) => t.trang_thai === "HOAN_THANH" && t.han_hoan_thanh);
    let onTimeDone = 0;
    let lateDone = 0;
    for (const t of doneWithHan) {
      const deadline = endOfDay(new Date(t.han_hoan_thanh));
      const ref = t.updated_at ? new Date(t.updated_at) : deadline;
      if (ref.getTime() <= deadline.getTime()) onTimeDone += 1;
      else lateDone += 1;
    }

    const staffMap: Record<
      string,
      { key: string; name: string; total: number; completed: number; cancelled: number; overdueOpen: number }
    > = {};

    for (const task of list) {
      const key = task.nguoi_phu_trach_id || `unassigned:${task.nguoi_phu_trach_ten || "none"}`;
      const name = task.nguoi_phu_trach_ten || "Chưa phân công";
      if (!staffMap[key]) {
        staffMap[key] = { key, name, total: 0, completed: 0, cancelled: 0, overdueOpen: 0 };
      }
      const row = staffMap[key];
      row.total += 1;
      if (task.trang_thai === "HOAN_THANH") row.completed += 1;
      if (task.trang_thai === "DA_HUY") row.cancelled += 1;
      if (
        task.trang_thai !== "HOAN_THANH" &&
        task.trang_thai !== "DA_HUY" &&
        (task.trang_thai === "QUA_HAN" || (task.han_hoan_thanh && new Date(task.han_hoan_thanh) < today))
      ) {
        row.overdueOpen += 1;
      }
    }

    const staff = Object.values(staffMap).sort((a, b) => b.total - a.total);

    const onTimeRateAmongDone = completed > 0 ? Math.round((onTimeDone / completed) * 100) : 0;

    return {
      total,
      completed,
      cancelled,
      overdueOpen,
      gate1,
      gate2,
      gate3,
      onTimeDone,
      lateDone,
      onTimeRateAmongDone,
      staff,
    };
  }, [tasks]);

  if (!tasks || tasks.length === 0) {
    return <div className="text-center p-8 text-slate-400">Chưa có dữ liệu để phân tích</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Tổng việc</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{analytics.total}</p>
        </div>
        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wide">Đã hoàn thành</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{analytics.completed}</p>
          <p className="text-[10px] text-emerald-700 mt-1">Đúng hạn (ước lượng): {analytics.onTimeRateAmongDone}% trong số đã xong</p>
        </div>
        <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Quá hạn (đang mở)</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{analytics.overdueOpen}</p>
        </div>
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide flex items-center gap-1">
            <Ban size={12} /> Đã hủy
          </p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{analytics.cancelled}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tồn đọng theo cổng</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
            <p className="text-[10px] font-black uppercase text-violet-700 tracking-widest">Cổng 1 — Phê đề xuất</p>
            <p className="text-2xl font-black text-violet-900 mt-1">{analytics.gate1}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
            <p className="text-[10px] font-black uppercase text-sky-700 tracking-widest">Cổng 2 — Chờ nhận việc</p>
            <p className="text-2xl font-black text-sky-900 mt-1">{analytics.gate2}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Cổng 3 — Chờ nghiệm thu</p>
            <p className="text-2xl font-black text-orange-900 mt-1">{analytics.gate3}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-[#026f17]" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hoàn thành đúng hạn / trễ (đã xong)</h3>
          </div>
          <span className="text-xs text-slate-500">
            Đúng hạn: <strong className="text-emerald-600">{analytics.onTimeDone}</strong> · Trễ:{" "}
            <strong className="text-amber-700">{analytics.lateDone}</strong>
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Đúng hạn: thời điểm cập nhật cuối ≤ cuối ngày hạn. Trễ: hoàn thành sau hạn (theo dữ liệu hiện có).
        </p>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{
              width: `${analytics.onTimeDone + analytics.lateDone > 0 ? (analytics.onTimeDone / (analytics.onTimeDone + analytics.lateDone)) * 100 : 0}%`,
            }}
          />
          <div className="h-full bg-amber-400 flex-1" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <UserCheck size={18} className="text-[#026f17]" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Theo người phụ trách</h3>
        </div>
        <div className="space-y-4">
          {analytics.staff.map((s) => {
            const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
            return (
              <div key={s.key} className="flex flex-col gap-2">
                <div className="flex justify-between items-end flex-wrap gap-2">
                  <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                  <div className="text-xs text-slate-500">
                    <span className="text-emerald-600 font-bold">{s.completed}</span> / {s.total} việc
                    {s.cancelled > 0 && <span className="text-slate-400 ml-2">({s.cancelled} hủy)</span>}
                    {s.overdueOpen > 0 && <span className="text-red-500 ml-2">({s.overdueOpen} quá hạn mở)</span>}
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${rate}%` }} />
                  <div className="h-full bg-slate-300" style={{ width: `${100 - rate}%` }} />
                </div>
              </div>
            );
          })}
          {analytics.staff.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu phân công.</p>}
        </div>
      </div>
    </div>
  );
}
