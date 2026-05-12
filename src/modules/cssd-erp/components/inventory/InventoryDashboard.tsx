// src/modules/cssd-erp/components/inventory/InventoryDashboard.tsx
"use client";

import React from "react";
import { ShieldCheck, Layers, AlertTriangle, Trash2, CalendarClock } from "lucide-react";

interface Props { data: any[]; }

/**
 * Dashboard thống kê kho dụng cụ (≤ 180 dòng)
 * Hiển thị 4 chỉ số: Tổng bộ sạch, Tổng món, Số bộ sắp hết hạn FEFO, Số bộ hỏng/mất.
 */
export default function InventoryDashboard({ data }: Props) {
  const clean = data.filter((d) => d.trang_thai_hien_tai === 'CAP_PHAT').length;
  
  // Tổng món = tổng số lượng chi tiết trong các bộ (giả định dùng trường suds_count để đếm món hoặc thuộc tính tương đương)
  const totalItems = data.reduce((acc, curr) => acc + (curr.dm_bo_dung_cu?.so_luong_mon || 1), 0);
  
  const issues = data.filter((d) => d.is_red_alert === true || d.tinh_trang === 'HONG' || d.tinh_trang === 'MAT').length;
  
  const fefoExpiring = data.filter(d => {
    if (!d.han_su_dung || d.trang_thai_hien_tai !== 'CAP_PHAT') return false;
    const daysLeft = (new Date(d.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7 && daysLeft >= 0; // Sắp hết hạn trong vòng 7 ngày
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
      <StatCard title="Tổng bộ sạch" value={clean} icon={<ShieldCheck />} color="bg-emerald-50" />
      <StatCard title="Tổng món" value={totalItems} icon={<Layers />} color="bg-blue-50" />
      <StatCard title="Sắp hết hạn (FEFO)" value={fefoExpiring} icon={<CalendarClock />} color="bg-orange-50" />
      <StatCard title="Hỏng / Mất" value={issues} icon={<Trash2 />} color="bg-red-50" isDark={false} />
    </div>
  );
}

function StatCard({ title, value, icon, color, isDark }: any) {
  return (
    <div className={`${color} p-6 rounded-[32px] border border-white flex justify-between items-center shadow-sm active:scale-95 transition-all group`}>
      <div className="space-y-1">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{title}</p>
        <p className={`text-3xl font-black tracking-tighter ${isDark ? 'text-[#FFD700]' : 'text-slate-900'}`}>{value}</p>
      </div>
      <div className={`p-4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 ${isDark ? '' : 'text-[#026f17]'}`}>
        {React.cloneElement(icon, { size: 22, strokeWidth: 3 })}
      </div>
    </div>
  );
}
