"use client";

import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  User,
  CheckCircle,
  Clock,
  FileText,
  Award,
  Pencil,
  ShieldCheck,
  MessageSquare,
  Ban,
  CalendarClock,
} from "lucide-react";

export interface Activity {
  id: string;
  loai_hoat_dong: string;
  noi_dung: string | null;
  phan_tram_hoan_thanh: number | null;
  created_at: string;
  nguoi: {
    ho_ten: string;
  } | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

type ActivityVisual = {
  icon: React.ReactNode;
  color: string;
  label: string;
  isUserNarrative: boolean;
};

function isUserNarrativeType(loai: string): boolean {
  return ["BAO_CAO_TIEN_DO", "CAP_NHAT", "TU_CHOI_HOAN_THANH", "DE_XUAT"].includes(loai);
}

const getActivityConfig = (loai: string): ActivityVisual => {
  switch (loai) {
    case "PHAN_CONG":
      return {
        icon: <User className="h-4 w-4" />,
        color: "bg-blue-50 text-blue-700 border-blue-100",
        label: "Phân công",
        isUserNarrative: false,
      };
    case "BAO_CAO_TIEN_DO":
      return {
        icon: <MessageSquare className="h-4 w-4" />,
        color: "bg-violet-50 text-violet-800 border-violet-100",
        label: "Báo cáo tiến độ",
        isUserNarrative: true,
      };
    case "CAP_NHAT":
      return {
        icon: <Pencil className="h-4 w-4" />,
        color: "bg-slate-50 text-slate-700 border-slate-200",
        label: "Cập nhật",
        isUserNarrative: true,
      };
    case "DE_XUAT":
      return {
        icon: <FileText className="h-4 w-4" />,
        color: "bg-purple-50 text-purple-700 border-purple-100",
        label: "Đề xuất",
        isUserNarrative: true,
      };
    case "PHE_DUYET":
      return {
        icon: <Award className="h-4 w-4" />,
        color: "bg-green-50 text-green-700 border-green-100",
        label: "Phê duyệt",
        isUserNarrative: false,
      };
    case "HOAN_THANH":
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        label: "Hoàn thành",
        isUserNarrative: false,
      };
    case "XAC_NHAN_NHAN":
      return {
        icon: <User className="h-4 w-4" />,
        color: "bg-sky-50 text-sky-700 border-sky-100",
        label: "Xác nhận nhận việc",
        isUserNarrative: false,
      };
    case "DUYET_HOAN_THANH":
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        color: "bg-emerald-50 text-emerald-800 border-emerald-100",
        label: "Nghiệm thu đạt",
        isUserNarrative: false,
      };
    case "TU_CHOI_HOAN_THANH":
      return {
        icon: <Ban className="h-4 w-4" />,
        color: "bg-amber-50 text-amber-800 border-amber-100",
        label: "Trả làm lại",
        isUserNarrative: true,
      };
    case "GIA_HAN":
      return {
        icon: <CalendarClock className="h-4 w-4" />,
        color: "bg-indigo-50 text-indigo-700 border-indigo-100",
        label: "Gia hạn",
        isUserNarrative: false,
      };
    default:
      return {
        icon: <Clock className="h-4 w-4" />,
        color: "bg-slate-50 text-slate-600 border-slate-100",
        label: loai.replace(/_/g, " "),
        isUserNarrative: isUserNarrativeType(loai),
      };
  }
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <Clock className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chưa có hoạt động nào được ghi nhận</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[21px] before:h-full before:w-0.5 before:-translate-x-px before:bg-slate-100">
      {activities.map((activity, index) => {
        const config = getActivityConfig(activity.loai_hoat_dong);
        const hasNarrative = Boolean(activity.noi_dung?.trim());
        const showCommentStyle = config.isUserNarrative && hasNarrative;

        return (
          <div
            key={activity.id}
            className="group relative flex gap-4 animate-in slide-in-from-left-2 duration-300 sm:gap-5"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <div className="z-10 flex flex-col items-center">
              <div
                className={`rounded-full border-2 bg-white p-2 shadow-sm transition-transform group-hover:scale-105 ${config.color}`}
              >
                {config.icon}
              </div>
            </div>

            <div className="min-w-0 flex-1 pb-2">
              <div
                className={`rounded-2xl border p-4 transition-shadow group-hover:shadow-md sm:p-5 ${
                  showCommentStyle
                    ? "border-violet-100/90 bg-violet-50/35"
                    : "border-slate-100 bg-white shadow-sm"
                }`}
              >
                <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {activity.nguoi?.ho_ten || "Hệ thống"}
                    </span>
                    <span
                      className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400 tabular-nums">
                    {format(new Date(activity.created_at), "HH:mm • dd/MM/yyyy", { locale: vi })}
                  </span>
                </div>

                {hasNarrative ? (
                  <p
                    className={`text-sm leading-relaxed ${
                      showCommentStyle ? "font-medium text-violet-950/90" : "font-medium text-slate-600"
                    }`}
                  >
                    {activity.noi_dung}
                  </p>
                ) : null}

                {activity.phan_tram_hoan_thanh !== null && activity.phan_tram_hoan_thanh > 0 ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/70 p-2.5 ring-1 ring-slate-100">
                    <span className="w-10 text-[11px] font-bold tabular-nums text-[var(--primary)]">
                      {activity.phan_tram_hoan_thanh}%
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-[var(--primary)] transition-all duration-700"
                        style={{ width: `${activity.phan_tram_hoan_thanh}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
