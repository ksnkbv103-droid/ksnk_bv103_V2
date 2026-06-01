"use client";

import React from "react";
import { CalendarClock } from "lucide-react";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { DinhKyRulesPanel } from "./DinhKyRulesPanel";

const DINH_KY_STEPS = [
  {
    step: "1",
    title: "Định nghĩa mẫu",
    body: "Tiêu đề + chu kỳ + ngày mốc. Mỗi dòng trong «Checklist mẫu» = một việc tick trên phiếu sinh ra.",
  },
  {
    step: "2",
    title: "Giao sẵn (khuyến nghị)",
    body: "Chọn tổ / người phụ trách mặc định — phiếu sinh ra vào Điều hành ở trạng thái Đang làm.",
  },
  {
    step: "3",
    title: "Sinh phiếu & theo dõi",
    body: "Cron 01:00 hoặc nút «Sinh phiếu hôm nay». Theo dõi tiến độ ở tab Điều hành (checklist).",
  },
] as const;

export function QlcvDinhKyPanel() {
  return (
    <KsnkSupervisionPanel className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100/90 bg-emerald-50/50 p-4">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
        <div className="min-w-0 space-y-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Việc định kỳ — tách khỏi đề xuất / việc đột xuất</p>
          <p className="text-xs leading-relaxed">
            Mẫu không qua cổng phê duyệt đề xuất. Chỉ huy quản lý mẫu tại đây; nhân viên chỉ tick checklist trên phiếu
            đã sinh (tab Điều hành).
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {DINH_KY_STEPS.map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-emerald-100/80 bg-white/80 p-3 text-xs leading-relaxed"
              >
                <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#026f17] text-[10px] font-bold text-white">
                  {s.step}
                </span>
                <p className="mt-1 font-semibold text-slate-800">{s.title}</p>
                <p className="text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <DinhKyRulesPanel />
    </KsnkSupervisionPanel>
  );
}
