// src/modules/cssd-erp/components/inventory/InventoryDashboard.tsx
"use client";

import React from "react";
import { WashingMachine, ShieldCheck, CheckCircle, AlertTriangle } from "lucide-react";

export type FilterStatusType =
  | "ALL"
  | "DANG_XU_LY"
  | "LAM_SACH"
  | "QC"
  | "DONG_GOI"
  | "TIET_KHUAN"
  | "DA_TIET_KHUAN"
  | "DA_CAP_PHAT"
  | "BROKEN";

const IN_PROCESS = new Set(["LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN"]);

interface Props {
  data: any[];
  activeStatus: FilterStatusType;
  onSelectStatus: (status: FilterStatusType) => void;
}

/** 4 ô lọc kho: đang xử lý / sẵn sàng / đã cấp / sự cố. */
export default function InventoryDashboard({ data, activeStatus, onSelectStatus }: Props) {
  const countDangXuLy = data.filter((d) => IN_PROCESS.has(String(d.trang_thai_hien_tai || ""))).length;
  const countSanSang = data.filter(
    (d) => d.trang_thai_hien_tai === "CAP_PHAT" && !d.ma_ca_mo_id,
  ).length;
  const countDaCap = data.filter(
    (d) => d.trang_thai_hien_tai === "CAP_PHAT" && d.ma_ca_mo_id,
  ).length;
  const countBroken = data.filter(
    (d) => d.is_red_alert === true || d.tinh_trang === "HONG" || d.tinh_trang === "MAT",
  ).length;

  const cards: {
    key: FilterStatusType;
    title: string;
    value: number;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    idle: string;
    active: string;
    text: string;
  }[] = [
    {
      key: "DANG_XU_LY",
      title: "Đang xử lý",
      value: countDangXuLy,
      icon: WashingMachine,
      idle: "bg-sky-50/70 border-sky-100 hover:bg-sky-100/50",
      active: "bg-sky-600 border-sky-600 text-white",
      text: "text-sky-700",
    },
    {
      key: "DA_TIET_KHUAN",
      title: "Sẵn sàng",
      value: countSanSang,
      icon: ShieldCheck,
      idle: "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/60",
      active: "bg-emerald-600 border-emerald-600 text-white",
      text: "text-emerald-700",
    },
    {
      key: "DA_CAP_PHAT",
      title: "Đã cấp",
      value: countDaCap,
      icon: CheckCircle,
      idle: "bg-teal-50/70 border-teal-100 hover:bg-teal-100/50",
      active: "bg-teal-600 border-teal-600 text-white",
      text: "text-teal-700",
    },
    {
      key: "BROKEN",
      title: "Sự cố",
      value: countBroken,
      icon: AlertTriangle,
      idle: "bg-red-50/70 border-red-100 hover:bg-red-100/50",
      active: "bg-red-600 border-red-600 text-white",
      text: "text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-in slide-in-from-top-4 duration-500">
      {cards.map(({ key, title, value, icon: Icon, idle, active, text }) => {
        const isActive = activeStatus === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectStatus(isActive ? "ALL" : key)}
            className={`group flex flex-col justify-between p-4 rounded-[var(--radius-shell)] border text-left transition-all duration-300 active:scale-[0.96] shadow-sm ${
              isActive ? active : idle
            }`}
          >
            <div
              className={`p-2 rounded-xl w-fit ${isActive ? "bg-white/20 text-white" : `${idle} ${text}`}`}
            >
              <Icon size={16} strokeWidth={2.5} />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? "text-white/80" : "text-slate-500"}`}>
                {title}
              </p>
              <p className={`text-xl font-semibold tabular-nums ${isActive ? "text-white" : "text-slate-900"}`}>
                {value}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
