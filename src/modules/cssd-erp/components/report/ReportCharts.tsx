// src/modules/cssd-erp/components/report/ReportCharts.tsx
"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";

const COLORS = ['#026f17', '#FFD700', '#dc2626', '#3b82f6', '#8b5cf6', '#ec4899'];

interface Props { pieData: any[]; barData: any[]; }

/**
 * Thành phần biểu đồ chi tiết CSSD (≤ 180 dòng)
 * Bao gồm Pie chart (Loại sự cố) và Stacked Bar (Mẻ vs Sự cố).
 */
export default function ReportCharts({ pieData, barData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Biểu đồ tròn: Tỷ lệ sự cố theo loại */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8 flex flex-col">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tỷ lệ sự cố theo danh mục</h3>
        <div className="h-[320px] w-full min-w-0 relative">
          <Bv103ResponsiveChart className="absolute inset-0 min-h-[320px]">
            <PieChart>
              <Pie data={pieData} innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none" animationBegin={200}>
                {pieData.map((_: any, idx: number) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          </Bv103ResponsiveChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-[#026f17]">
              {pieData.reduce((acc, curr) => acc + curr.value, 0)}
            </span>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Sự cố</span>
          </div>
        </div>
      </div>

      {/* 2. Biểu đồ cột chồng: So sánh mẻ tiệt khuẩn và sự cố */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hiệu suất mẻ tiệt khuẩn vs Sự cố</h3>
        <div className="h-[320px] w-full min-w-0">
          <Bv103ResponsiveChart className="h-full w-full">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" fontSize={9} fontStyle="bold" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} fontSize={9} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '24px', border: 'none'}} />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase'}} />
              <Bar dataKey="batches" name="Tổng mẻ" fill="#026f17" radius={[8, 8, 0, 0]} barSize={24} />
              <Bar dataKey="incidents" name="Sự cố" fill="#dc2626" radius={[8, 8, 0, 0]} barSize={24} />
            </BarChart>
          </Bv103ResponsiveChart>
        </div>
      </div>
    </div>
  );
}
