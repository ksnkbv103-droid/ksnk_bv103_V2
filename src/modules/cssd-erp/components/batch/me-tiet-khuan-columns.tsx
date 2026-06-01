// src/modules/cssd-erp/components/batch/me-tiet-khuan-columns.tsx
"use client";

import type { Column } from "@/components/shared/AdvancedDataTable";

export const meTietKhuanBatchColumns: Column<any>[] = [
  {
    header: "MÃ LÔ",
    accessorKey: "ma_lo_tiet_khuan",
    cell: (i: any) => <span className="text-[11px] font-black uppercase text-[#026f17]">{i.ma_lo_tiet_khuan}</span>,
  },
  {
    header: "SỐ BỘ TRONG MẺ",
    accessorKey: "so_bo_trong_me",
    cell: (i: any) => (
      <span className="text-[10px] font-black tabular-nums text-slate-700">
        {typeof i.so_bo_trong_me === "number" ? i.so_bo_trong_me : 0}
      </span>
    ),
  },
  {
    header: "THIẾT BỊ",
    accessorKey: "thiet_bi.ten_thiet_bi",
    cell: (i: any) => <span className="text-[10px] font-bold uppercase text-slate-600">{i.thiet_bi?.ten_thiet_bi || "N/A"}</span>,
  },
  {
    header: "QC TEST",
    accessorKey: "ket_qua_test",
    cell: (i: any) => (
      <span
        className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${
          i.ket_qua_test === true ? "bg-emerald-50 text-emerald-600" : i.ket_qua_test === false ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        {i.ket_qua_test === true ? "ĐẠT QC" : i.ket_qua_test === false ? "LỖI" : "CHƯA QC"}
      </span>
    ),
  },
  {
    header: "TRẠNG THÁI",
    accessorKey: "trang_thai",
    cell: (i: any) => {
      const state = String(i.trang_thai || "");
      const STATE_BADGES: Record<string, { label: string; cls: string }> = {
        DANG_CHUAN_NAP: { label: "📥 Chuẩn bị nạp", cls: "bg-sky-50 text-sky-700 border-sky-100" },
        DANG_TIET_KHUAN: { label: "🔥 Đang tiệt khuẩn", cls: "bg-blue-50 text-blue-700 border-blue-100" },
        CHO_DANH_GIA_QC: { label: "🔬 Chờ đánh giá QC", cls: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" },
        QC_KHONG_DAT: { label: "❌ Lỗi tiệt khuẩn", cls: "bg-red-50 text-red-700 border-red-100" },
        HOAN_THANH: { label: "🏆 Đạt (Chờ cấp phát)", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      };
      const badge = STATE_BADGES[state] || { label: state, cls: "bg-slate-50 text-slate-600 border-slate-100" };
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.cls}`}>
          {badge.label}
        </span>
      );
    },
  },
  {
    header: "GHI CHÚ",
    accessorKey: "ghi_chu",
    cell: (i: any) => <span className="block max-w-[150px] truncate text-[10px] text-slate-500">{i.ghi_chu || "---"}</span>,
  },
];
