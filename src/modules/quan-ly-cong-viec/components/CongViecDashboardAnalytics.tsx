"use client";

import React, { useMemo } from "react";
import { UserCheck, ClipboardList, Timer, PieChart as PieChartIcon, Gauge } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { countCongViecFivePieSlices, QLCV_FIVE_PIE_META, type QlcvFivePieKey } from "../lib/qlcv-five-pie-status";
import { QLCV_ROOT_TASK_LIST_MAX } from "../lib/qlcv-query-limits";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import type { CongViecView } from "../types";

interface Props {
  tasks: CongViecView[];
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function CongViecDashboardAnalytics({ tasks }: Props) {
  const list = tasks || [];

  const analytics = useMemo(() => {
    const total = list.length;
    const cancelled = list.filter((t) => t.trang_thai === "DA_HUY").length;
    const completed = list.filter((t) => t.trang_thai === "HOAN_THANH").length;

    const gate1 = list.filter((t) => isDeXuatChoDuyet(t)).length;
    const gate2 = list.filter((t) => isChoNhanViec(t)).length;
    const gate3 = list.filter((t) => isChoNghiemThuHoanThanh(t)).length;

    const overdueOpen = list.filter((t) => isBoardLaneQuaHan(t)).length;

    const doneWithHan = list.filter((t) => t.trang_thai === "HOAN_THANH" && t.han_hoan_thanh);
    let onTimeDone = 0;
    let lateDone = 0;
    for (const t of doneWithHan) {
      if (!t.han_hoan_thanh) continue;
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
      if (isBoardLaneQuaHan(task)) row.overdueOpen += 1;
    }

    const staff = Object.values(staffMap).sort((a, b) => b.total - a.total);

    const onTimeRateAmongDone = completed > 0 ? Math.round((onTimeDone / completed) * 100) : 0;

    const fiveCounts = countCongViecFivePieSlices(list);
    const pieData = QLCV_FIVE_PIE_META.map((m) => ({
      key: m.key,
      name: m.label,
      value: fiveCounts[m.key as QlcvFivePieKey],
      fill: m.color,
    }));
    const pieDataActive = pieData.filter((d) => d.value > 0);

    const pctOverdue = total > 0 ? Math.round((overdueOpen / total) * 1000) / 10 : 0;
    const pctCancelled = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

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
      fiveCounts,
      pieData,
      pieDataActive,
      pctOverdue,
      pctCancelled,
    };
  }, [list]);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="space-y-4">
        <p className={bv103LayoutChrome.noticeSlateRelaxed}>
          Biểu đồ dựa trên danh sách phiếu gốc trên trang (tối đa{" "}
          <strong className="tabular-nums">{QLCV_ROOT_TASK_LIST_MAX}</strong>). Ô số tổng phía trên là đếm server.
        </p>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
          Chưa có phiếu trong danh sách để vẽ biểu đồ — tạo hoặc tải lại sau khi có dữ liệu.
        </div>
      </div>
    );
  }

  const pieHasData = analytics.pieDataActive.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <p className={bv103LayoutChrome.noticeSlateRelaxed}>
        Biểu đồ và bảng phụ bên dưới dựa trên <strong className="text-slate-800">danh sách phiếu gốc</strong> đang tải trên
        trang (tối đa <strong className="tabular-nums">{QLCV_ROOT_TASK_LIST_MAX}</strong> bản ghi). Các ô số tổng ở trên
        tab «Thống kê» là <strong className="text-slate-800">đếm server</strong> (đầy đủ phiếu gốc trong DB).
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon size={18} className="text-[#026f17]" aria-hidden />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Phân bổ theo 5 trạng thái</h3>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Tổng <strong className="text-slate-800">{analytics.total}</strong> phiếu công việc trong danh sách. «Đã hủy» gồm các
            việc kết thúc không hoàn thành sau khi chỉ huy khoa xác nhận trên hệ thống.
          </p>
          {pieHasData ? (
            <div className="flex min-h-[260px] flex-col gap-4 md:flex-row md:items-center">
              <div className="h-[240px] w-full min-w-0 flex-1 md:max-w-[55%]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.pieDataActive}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={1}
                    >
                      {analytics.pieDataActive.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => [`${Number(value ?? 0)} việc`, "Số lượng"]} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Nhóm</th>
                      <th className="px-3 py-2 text-right">Số lượng</th>
                      <th className="px-3 py-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QLCV_FIVE_PIE_META.map((m) => {
                      const n = analytics.fiveCounts[m.key];
                      const pct = analytics.total > 0 ? Math.round((n / analytics.total) * 1000) / 10 : 0;
                      return (
                        <tr key={m.key} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: m.color }} />
                            <span className="font-medium text-slate-700">{m.label}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">{n}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Không đủ dữ liệu để vẽ biểu đồ.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gauge size={18} className="text-[#026f17]" aria-hidden />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Đánh giá hiệu quả (trên tổng đã giao)</h3>
          </div>
          <p className="mb-6 text-xs leading-relaxed text-slate-500">
            Mẫu số: tổng số phiếu công việc trong danh sách hiện tại ({analytics.total}). «Việc không hoàn thành (hủy)» = trạng thái{" "}
            <strong className="text-slate-700">Đã hủy</strong> — quy trình hệ thống yêu cầu chỉ huy khoa xác nhận trước khi ghi nhận
            hủy.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-800/90">Tỷ lệ việc quá hạn</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-red-700">{analytics.pctOverdue}%</p>
              <p className="mt-2 text-[11px] text-red-800/80">
                {analytics.overdueOpen} / {analytics.total} việc đang mở và đã quá hạn hoặc trạng thái «Quá hạn».
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Tỷ lệ không hoàn thành (hủy)</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-700">{analytics.pctCancelled}%</p>
              <p className="mt-2 text-[11px] text-slate-600">
                {analytics.cancelled} / {analytics.total} việc kết thúc bằng hủy (sau xác nhận chỉ huy khoa).
              </p>
            </div>
          </div>
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
