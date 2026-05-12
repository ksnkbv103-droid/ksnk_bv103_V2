"use client";

import React from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import type { KhoHoaChatGiaoDichRow, KhoHoaChatTonLo } from "../../actions/cssd-kho-hoa-chat.actions";

const tonCols: Column<KhoHoaChatTonLo>[] = [
  { header: "MÃ", accessorKey: "ma_hoa_chat", cell: (i) => <span className="font-mono text-[11px] font-bold text-[#026f17]">{i.ma_hoa_chat}</span> },
  { header: "TÊN", accessorKey: "ten_hoa_chat", cell: (i) => <span className="text-[11px] font-semibold">{i.ten_hoa_chat}</span> },
  { header: "LÔ", accessorKey: "ma_lo", cell: (i) => <span className="text-[10px]">{i.ma_lo || "—"}</span> },
  { header: "HSD", accessorKey: "han_su_dung", cell: (i) => <span className="text-[10px]">{i.han_su_dung || "—"}</span> },
  { header: "TỒN", accessorKey: "ton_so_luong", cell: (i) => <span className="tabular-nums">{i.ton_so_luong}</span> },
  { header: "ĐVT", accessorKey: "don_vi_tinh", cell: (i) => <span className="text-[10px] text-slate-500">{i.don_vi_tinh || "—"}</span> },
];

const movCols: Column<KhoHoaChatGiaoDichRow>[] = [
  { header: "PHIẾU", accessorKey: "ma_phieu", cell: (i) => <span className="font-mono text-[10px] font-bold">{i.ma_phieu}</span> },
  { header: "LOẠI", accessorKey: "loai_giao_dich", cell: (i) => <span className="text-[10px] font-black">{i.loai_giao_dich}</span> },
  { header: "MẶT HÀNG", accessorKey: "ten_hoa_chat", cell: (i) => <span className="text-[10px]">{i.ten_hoa_chat || "—"}</span> },
  { header: "SL", accessorKey: "so_luong_co_dau", cell: (i) => <span className="tabular-nums text-[11px]">{i.so_luong_co_dau}</span> },
  { header: "LÔ/HSD", accessorKey: "ma_lo", cell: (i) => <span className="text-[10px]">{[i.ma_lo, i.han_su_dung].filter(Boolean).join(" • ") || "—"}</span> },
  { header: "THỜI ĐIỂM", accessorKey: "created_at", cell: (i) => <span className="text-[10px]">{i.created_at ? new Date(i.created_at).toLocaleString("vi-VN") : "—"}</span> },
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
