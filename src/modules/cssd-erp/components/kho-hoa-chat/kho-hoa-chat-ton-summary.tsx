"use client";

import React from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { isHoaChatLoai } from "@/lib/domain/cssd-hoa-chat-loai";
import type { DmStockSummary } from "@/lib/domain/cssd-kho-hoa-chat-summary";
import { formatDateVi } from "@/lib/format-datetime-vi";

const BADGE = "bv103-type-label inline-flex items-center rounded border px-1.5 py-0.5 font-semibold";

const cols: Column<DmStockSummary>[] = [
  {
    header: "Loại",
    accessorKey: "loai_hoa_chat",
    sortable: true,
    cell: (i) => (
      <span className="bv103-type-label font-medium text-slate-700">
        {isHoaChatLoai(i.loai_hoa_chat) ? "Hóa chất" : "Vật tư"}
      </span>
    ),
  },
  {
    header: "Mã",
    accessorKey: "ma_hoa_chat",
    sortable: true,
    cell: (i) => <span className="bv103-type-label font-mono font-semibold text-[var(--primary)]">{i.ma_hoa_chat}</span>,
  },
  {
    header: "Tên mặt hàng",
    accessorKey: "ten_hoa_chat",
    sortable: true,
    cell: (i) => <span className="bv103-type-label text-slate-700">{i.ten_hoa_chat}</span>,
  },
  {
    header: "Tồn",
    accessorKey: "tong_ton",
    sortable: true,
    cell: (i) => (
      <span className="bv103-type-label tabular-nums font-semibold">
        {i.tong_ton} {i.don_vi_tinh || ""}
      </span>
    ),
  },
  {
    header: "Định mức",
    accessorKey: "nguong_ton_toi_thieu",
    sortable: true,
    cell: (i) => (
      <span className="bv103-type-label tabular-nums text-slate-600">{i.nguong_ton_toi_thieu ?? "—"}</span>
    ),
  },
  {
    header: "Hạn gần nhất",
    accessorKey: "han_gan_nhat",
    sortable: true,
    cell: (i) => (
      <span className="bv103-type-label text-slate-600">{i.han_gan_nhat ? formatDateVi(i.han_gan_nhat) : "—"}</span>
    ),
  },
  {
    header: "Cảnh báo",
    accessorKey: "id",
    cell: (i) => (
      <span className="flex flex-wrap gap-1">
        {i.duoi_dinh_muc ? <span className={`${BADGE} border-red-200 bg-red-50 text-red-700`}>Dưới định mức</span> : null}
        {i.qua_han ? <span className={`${BADGE} border-red-200 bg-red-50 text-red-700`}>Quá hạn</span> : null}
        {i.sap_het_han ? <span className={`${BADGE} border-amber-200 bg-amber-50 text-amber-800`}>Sắp hết hạn</span> : null}
      </span>
    ),
  },
];

export default function KhoHoaChatTonSummary({ rows, loading }: { rows: DmStockSummary[]; loading: boolean }) {
  return <AdvancedDataTable columns={cols} data={rows} loading={loading} searchPlaceholder="Tìm mặt hàng..." />;
}
