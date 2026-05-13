"use client";

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Column } from "@/components/shared/AdvancedDataTable";
import type { NhanSu } from "../../types";

/**
 * Định nghĩa cột cho bảng Nhân sự - Tách ra để NhanSuTable gọn hơn
 */
export function getNhanSuColumns(
  onEdit: (item: NhanSu) => void,
  onDelete: (id: string) => void
): Column<NhanSu>[] {
  return [
    {
      header: "Mã Nhân viên",
      accessorKey: "ma_nv",
      sortable: true,
      cell: (item) => <code className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.ma_nv}</code>
    },
    {
      header: "Họ và tên",
      accessorKey: "ho_ten",
      sortable: true,
      cell: (item) => <p className="font-bold text-slate-800 text-base leading-tight group-hover:text-[#026f17]">{item.ho_ten}</p>
    },
    {
      header: "Nghề nghiệp",
      accessorKey: "nghe_nghiep_id",
      sortable: true,
      cell: (item) => (
        <span className="text-sm font-medium text-slate-700">
          {item.nghe_nghiep?.ten_nghe_nghiep || "—"}
        </span>
      )
    },
    {
      header: "Khoa / Phòng",
      accessorKey: "khoa_id",
      sortable: true,
      cell: (item) => (
        <div className="flex flex-col gap-1">
          <span className="px-4 py-1.5 rounded-full bg-white border border-slate-100 text-[#026f17] text-[10px] font-black uppercase tracking-tighter w-fit">
            {item.khoa?.ten_khoa || "Chưa thiết lập khoa"}
          </span>
          {item.to?.ten_danh_muc && (
            <span className="px-4 py-1 rounded-full bg-amber-50 text-amber-600 text-[9px] font-bold uppercase tracking-tighter w-fit">
              {item.to.ten_danh_muc}
            </span>
          )}
        </div>
      )
    },
    {
      header: "Chức danh",
      accessorKey: "chuc_danh",
      sortable: true,
      cell: (item) => (
        <div>
          <p className="text-sm font-medium text-slate-600">{item.chuc_danh || "—"}</p>
          <p className="text-[10px] text-slate-400 italic">{item.chuc_vu || ""}</p>
        </div>
      )
    },
    {
      header: "Thao tác",
      accessorKey: "actions",
      cell: (item) => (
        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[#026f17] hover:bg-[#026f17] hover:text-white transition-all shadow-sm"
            title="Sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];
}
