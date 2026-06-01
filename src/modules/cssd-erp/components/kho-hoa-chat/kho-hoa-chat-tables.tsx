"use client";

import React from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import type { KhoHoaChatGiaoDichRow, KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";

const tonCols: Column<KhoHoaChatTonLo>[] = [
  { 
    header: "MÃ", 
    accessorKey: "ma_hoa_chat", 
    cell: (i) => <span className="font-mono text-[11px] font-bold text-[#026f17]">{i.ma_hoa_chat}</span> 
  },
  { 
    header: "TÊN MẶT HÀNG", 
    accessorKey: "ten_hoa_chat", 
    cell: (i) => <span className="text-[11px] font-bold uppercase text-slate-700">{i.ten_hoa_chat}</span> 
  },
  { 
    header: "MÃ LÔ", 
    accessorKey: "ma_lo", 
    cell: (i) => (
      <span className="font-mono text-[10px] rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-slate-600 font-bold">
        {i.ma_lo || "Không mã"}
      </span>
    ) 
  },
  { 
    header: "HẠN SỬ DỤNG", 
    accessorKey: "han_su_dung", 
    cell: (i) => {
      if (!i.han_su_dung) return <span className="text-[10px] text-slate-400">—</span>;
      const h = new Date(`${i.han_su_dung}T12:00:00`).getTime();
      const isNear = !Number.isNaN(h) && (h - Date.now() <= 30 * 864e5);
      return (
        <span className={`text-[10px] font-bold ${isNear ? "text-amber-600 animate-pulse bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" : "text-slate-600"}`}>
          {i.han_su_dung}
        </span>
      );
    } 
  },
  { 
    header: "SỐ LƯỢNG TỒN", 
    accessorKey: "ton_so_luong", 
    cell: (i) => {
      const q = i.ton_so_luong;
      if (q <= 0) {
        return <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400">Hết tồn</span>;
      }
      if (q <= 10) {
        return (
          <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-700 tabular-nums">
            {q} (Cảnh báo ít)
          </span>
        );
      }
      return (
        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 tabular-nums">
          {q}
        </span>
      );
    } 
  },
  { 
    header: "ĐƠN VỊ TÍNH", 
    accessorKey: "don_vi_tinh", 
    cell: (i) => <span className="text-[10px] font-bold text-slate-500">{i.don_vi_tinh || "—"}</span> 
  },
];

const movCols: Column<KhoHoaChatGiaoDichRow>[] = [
  { 
    header: "MÃ PHIẾU", 
    accessorKey: "ma_phieu", 
    cell: (i) => <span className="font-mono text-[10px] font-black text-[#026f17]">{i.ma_phieu}</span> 
  },
  { 
    header: "LOẠI GIAO DỊCH", 
    accessorKey: "loai_giao_dich", 
    cell: (i) => {
      const type = i.loai_giao_dich;
      if (type === "NHAP" || type === "NHAP_KHO") {
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 shadow-sm">
            + Nhập kho
          </span>
        );
      }
      if (type === "XUAT" || type === "XUAT_KHO") {
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700 shadow-sm">
            - Xuất kho
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700 shadow-sm">
          ⚙ Điều chỉnh
        </span>
      );
    } 
  },
  { 
    header: "MẶT HÀNG / VẬT TƯ", 
    accessorKey: "ten_hoa_chat", 
    cell: (i) => <span className="text-[10px] font-bold text-slate-700 uppercase">{i.ten_hoa_chat || "—"}</span> 
  },
  { 
    header: "SỐ LƯỢNG", 
    accessorKey: "so_luong_co_dau", 
    cell: (i) => {
      const q = i.so_luong_co_dau;
      const isPos = q > 0;
      return (
        <span className={`tabular-nums text-[11px] font-black ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
          {isPos ? `+${q}` : q}
        </span>
      );
    } 
  },
  { 
    header: "MÃ LÔ / HẠN DÙNG", 
    accessorKey: "ma_lo", 
    cell: (i) => (
      <span className="text-[10px] text-slate-600">
        Lô: <span className="font-mono font-bold text-slate-700">{i.ma_lo || "Không"}</span>
        {i.han_su_dung ? ` · HSD: ${i.han_su_dung}` : ""}
      </span>
    ) 
  },
  { 
    header: "THỜI ĐIỂM", 
    accessorKey: "created_at", 
    cell: (i) => <span className="text-[10px] text-slate-500">{i.created_at ? new Date(i.created_at).toLocaleString("vi-VN") : "—"}</span> 
  },
];

type Props = {
  tons: KhoHoaChatTonLo[];
  movs: KhoHoaChatGiaoDichRow[];
  loading: boolean;
};

export default function KhoHoaChatTables({ tons, movs, loading }: Props) {
  return (
    <>
      <div className="mt-6 min-h-[300px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        <AdvancedDataTable columns={tonCols} data={tons} loading={loading} searchPlaceholder="Tìm trong tồn lô..." />
      </div>
      <p className="mt-6 text-[10px] font-black uppercase text-slate-500">Phiếu gần đây</p>
      <div className="mt-2 min-h-[260px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        <AdvancedDataTable columns={movCols} data={movs} loading={loading} searchPlaceholder="Tìm phiếu..." />
      </div>
    </>
  );
}
