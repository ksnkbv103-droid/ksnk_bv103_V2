// src/modules/cssd-erp/components/inventory/InventoryHistoryTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { History, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";

/**
 * Bảng lịch sử giao dịch kho dụng cụ (≤ 180 dòng)
 * Hiển thị các giao dịch Luân chuyển, Báo hỏng, Báo mất và Bổ sung.
 */
export default function InventoryHistoryTable() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: res } = await supabase
      .from("fact_kho_giao_dich")
      .select("*, dm_khoa_phong(ten_khoa), kho_chi_tiet(so_luong, ghi_chu)")
      .order("created_at", { ascending: false })
      .limit(50);
    setData(res || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const columns: Column<any>[] = [
    { header: "LOẠI GIAO DỊCH", accessorKey: "loai_giao_dich", cell: (item: any) => (
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${item.loai_giao_dich === 'XUAT_KHO' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
          {item.loai_giao_dich === 'XUAT_KHO' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
        </div>
        <span className="font-black text-[9px] uppercase tracking-tighter">{item.loai_giao_dich.replace('_', ' ')}</span>
      </div>
    )},
    { header: "KHOA NHẬN / NGUỒN", accessorKey: "dm_khoa_phong.ten_khoa", cell: (item: any) => (
      <span className="font-bold text-slate-700 text-[10px] uppercase truncate max-w-[120px] block">
        {item.dm_khoa_phong?.ten_khoa || "KHO CSSD"}
      </span>
    )},
    { header: "GHI CHÚ", accessorKey: "ghi_chu", cell: (item: any) => (
      <span className="text-slate-400 font-medium text-[9px] truncate max-w-[150px] block italic">
        {item.kho_chi_tiet?.[0]?.ghi_chu || "---"}
      </span>
    )},
    { header: "THỜI GIAN", accessorKey: "created_at", cell: (item: any) => (
      <span className="text-slate-400 font-bold text-[9px] whitespace-nowrap">
        {new Date(item.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
      </span>
    )}
  ];

  return (
    <div className="bg-white p-2 rounded-[48px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><History size={20} /></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Lịch sử giao dịch kho</h3>
        </div>
        <button onClick={fetchHistory} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-[#026f17] active:rotate-180 transition-all duration-500">
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="min-h-[400px]">
        <AdvancedDataTable columns={columns} data={data} loading={loading} enableMultiSelect={false} searchPlaceholder="Tìm theo mã giao dịch..." />
      </div>
    </div>
  );
}
