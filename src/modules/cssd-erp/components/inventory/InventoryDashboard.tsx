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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm animate-in slide-in-from-top-2 duration-300">
      {cards.map(({ key, title, value, icon: Icon, idle, active, text }) => {
        const isActive = activeStatus === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectStatus(isActive ? "ALL" : key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition-all active:scale-[0.98] ${
              isActive ? `${active} shadow-sm` : `${idle} ${text}`
            }`}
          >
            <Icon size={13} strokeWidth={2.5} aria-hidden />
            <span>{title}</span>
            <span className={`tabular-nums ${isActive ? "text-white" : "text-slate-800"}`}>{value}</span>
          </button>
        );
      })}
    </div>
  );
}
