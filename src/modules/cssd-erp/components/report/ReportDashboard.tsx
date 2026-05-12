// src/modules/cssd-erp/components/report/ReportDashboard.tsx
"use client";

import React from "react";
import { AlertCircle, Target, Zap, Trophy, ShieldAlert } from "lucide-react";

interface Props {
  stats: { total: number; incidents: number; compliance: string; bestStation: string; worstStation: string; };
  alerts: { name: string; rate: string }[];
}

/**
 * Dashboard thống kê nhanh & Cảnh báo tự động (≤ 180 dòng)
 * Hiển thị các chỉ số KPI then chốt và cảnh báo đỏ nếu tỷ lệ lỗi vượt ngưỡng.
 */
export default function ReportDashboard({ stats, alerts }: Props) {
  return (
    <div className="space-y-6">
      {/* 1. KPI Cards - Xếp dọc trên mobile, 4 cột trên desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng quy trình" value={stats.total} icon={<Zap />} color="bg-emerald-50" textColor="text-emerald-700" />
        <StatCard title="Số vụ sự cố" value={stats.incidents} icon={<ShieldAlert />} color="bg-red-50" textColor="text-red-600" />
        <StatCard title="Tỷ lệ tuân thủ" value={`${stats.compliance}%`} icon={<Target />} color="bg-blue-50" textColor="text-blue-700" />
        <StatCard title="Trạm tốt nhất" value={stats.bestStation} icon={<Trophy />} color="bg-amber-50" textColor="text-amber-700" isStation />
      </div>

      {/* 2. Automated Alerts - Hiển thị nếu có trạm lỗi > 5% */}
      {alerts.length > 0 && (
        <div className="bg-red-600 p-8 rounded-[40px] text-white space-y-4 shadow-2xl shadow-red-200 animate-in zoom-in duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl animate-pulse"><AlertCircle size={28} strokeWidth={3} /></div>
            <div>
              <h4 className="font-black uppercase tracking-[0.2em] text-sm">CẢNH BÁO ĐỎ HỆ THỐNG</h4>
              <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Phát hiện trạm có tỷ lệ sai sót vượt ngưỡng an toàn</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((a, i) => (
              <div key={i} className="bg-black/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                <p className="font-black text-base uppercase">Trạm {a.name.replace('_', ' ')}</p>
                <p className="text-sm font-bold text-red-100 mt-1">Tỷ lệ lỗi: {a.rate}% (&gt;5%)</p>
                <div className="mt-3 pt-3 border-t border-white/10 text-[10px] font-medium italic opacity-80 leading-relaxed">
                  Gợi ý: Yêu cầu rà soát quy trình kỹ thuật và đào tạo lại nhân sự tại khu vực này ngay lập tức.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, textColor, isStation }: any) {
  return (
    <div className={`${color} p-8 rounded-[40px] border border-white flex flex-col justify-between h-48 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group`}>
      <div className="flex justify-between items-start relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <div className={`p-3 bg-white rounded-2xl shadow-lg shadow-slate-200 transition-transform group-hover:rotate-12 ${textColor}`}>{React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}</div>
      </div>
      <div className="relative z-10">
        <p className={`font-black tracking-tighter leading-none ${isStation ? 'text-lg uppercase' : 'text-4xl'}`}>{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-black">{React.cloneElement(icon, { size: 120 })}</div>
    </div>
  );
}
