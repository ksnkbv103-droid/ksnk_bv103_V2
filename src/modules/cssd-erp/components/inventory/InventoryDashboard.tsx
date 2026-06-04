// src/modules/cssd-erp/components/inventory/InventoryDashboard.tsx
"use client";

import React from "react";
import {
  Layers,
  Droplets,
  Search,
  Package,
  Flame,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export type FilterStatusType =
  | "ALL"
  | "LAM_SACH"
  | "QC"
  | "DONG_GOI"
  | "TIET_KHUAN"
  | "DA_TIET_KHUAN"
  | "DA_CAP_PHAT"
  | "BROKEN";

interface Props {
  data: any[];
  activeStatus: FilterStatusType;
  onSelectStatus: (status: FilterStatusType) => void;
}

/**
 * Dashboard thống kê kho dụng cụ 8 trạng thái (BV103 - Click to Filter)
 * Tự động tính toán số lượng của từng trạng thái dụng cụ thực tế và hỗ trợ tương tác chọn bộ lọc.
 */
export default function InventoryDashboard({ data, activeStatus, onSelectStatus }: Props) {
  const countAll = data.length;
  const countLamSach = data.filter((d) => d.trang_thai_hien_tai === "LAM_SACH").length;
  const countQC = data.filter((d) => d.trang_thai_hien_tai === "QC").length;
  const countDongGoi = data.filter((d) => d.trang_thai_hien_tai === "DONG_GOI").length;
  const countTietKhuan = data.filter((d) => d.trang_thai_hien_tai === "TIET_KHUAN").length;
  const countDaTietKhuan = data.filter(
    (d) => d.trang_thai_hien_tai === "CAP_PHAT" && !d.ma_ca_mo_id,
  ).length;
  const countDaCapPhat = data.filter(
    (d) => d.trang_thai_hien_tai === "CAP_PHAT" && d.ma_ca_mo_id,
  ).length;
  const countBroken = data.filter(
    (d) => d.is_red_alert === true || d.tinh_trang === "HONG" || d.tinh_trang === "MAT",
  ).length;

  const STATS_CONFIG: {
    key: FilterStatusType;
    title: string;
    value: number;
    icon: React.ComponentType<any>;
    color: string;
    activeColor: string;
    textColor: string;
  }[] = [
    {
      key: "ALL",
      title: "Tất cả",
      value: countAll,
      icon: Layers,
      color: "bg-slate-50 border-slate-100 hover:bg-slate-100/70",
      activeColor: "bg-slate-900 border-slate-900 text-white",
      textColor: "text-slate-600",
    },
    {
      key: "LAM_SACH",
      title: "Đang làm sạch",
      value: countLamSach,
      icon: Droplets,
      color: "bg-sky-50/70 border-sky-100 hover:bg-sky-100/50",
      activeColor: "bg-sky-600 border-sky-600 text-white",
      textColor: "text-sky-700",
    },
    {
      key: "QC",
      title: "Đang kiểm tra",
      value: countQC,
      icon: Search,
      color: "bg-violet-50/70 border-violet-100 hover:bg-violet-100/50",
      activeColor: "bg-violet-600 border-violet-600 text-white",
      textColor: "text-violet-700",
    },
    {
      key: "DONG_GOI",
      title: "Đang đóng gói",
      value: countDongGoi,
      icon: Package,
      color: "bg-amber-50/70 border-amber-100 hover:bg-amber-100/50",
      activeColor: "bg-amber-600 border-amber-600 text-white",
      textColor: "text-amber-700",
    },
    {
      key: "TIET_KHUAN",
      title: "Đang tiệt khuẩn",
      value: countTietKhuan,
      icon: Flame,
      color: "bg-orange-50/70 border-orange-100 hover:bg-orange-100/50",
      activeColor: "bg-orange-600 border-orange-600 text-white",
      textColor: "text-orange-700",
    },
    {
      key: "DA_TIET_KHUAN",
      title: "Đã tiệt khuẩn",
      value: countDaTietKhuan,
      icon: ShieldCheck,
      color: "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/60",
      activeColor: "bg-emerald-600 border-emerald-600 text-white",
      textColor: "text-emerald-700",
    },
    {
      key: "DA_CAP_PHAT",
      title: "Đã cấp phát",
      value: countDaCapPhat,
      icon: CheckCircle,
      color: "bg-teal-50/70 border-teal-100 hover:bg-teal-100/50",
      activeColor: "bg-teal-600 border-teal-600 text-white",
      textColor: "text-teal-700",
    },
    {
      key: "BROKEN",
      title: "Sự cố / Hỏng",
      value: countBroken,
      icon: AlertTriangle,
      color: "bg-red-50/70 border-red-100 hover:bg-red-100/50",
      activeColor: "bg-red-600 border-red-600 text-white",
      textColor: "text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 animate-in slide-in-from-top-4 duration-500">
      {STATS_CONFIG.map(({ key, title, value, icon: Icon, color, activeColor, textColor }) => {
        const isActive = activeStatus === key;
        return (
          <button
            key={key}
            onClick={() => onSelectStatus(key)}
            type="button"
            className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 active:scale-[0.96] shadow-sm ${
              isActive ? activeColor : color
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className={`p-2 rounded-xl transition-colors duration-300 ${
                  isActive ? "bg-white/20 text-white" : `${color} ${textColor}`
                }`}
              >
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? "text-white/60" : "text-slate-400"}`}>
                {isActive ? "Đang chọn" : ""}
              </span>
            </div>

            <div className="mt-4 space-y-0.5">
              <p
                className={`text-[11px] font-black uppercase tracking-wider truncate block ${
                  isActive ? "text-white/80" : "text-slate-500"
                }`}
              >
                {title}
              </p>
              <p
                className={`text-xl font-black tracking-tight tabular-nums ${
                  isActive ? "text-[#FFD700]" : "text-slate-900"
                }`}
              >
                {value}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
