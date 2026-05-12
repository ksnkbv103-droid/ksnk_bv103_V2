"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import { MdmActiveToggle } from "@/components/shared/MdmActiveToggle";

export type GenericDmRow = { id: string } & Record<string, unknown>;

export function buildGenericDmColumns(
  maCol: string,
  tenCol: string,
  canMutate: boolean,
  canDelete: boolean,
  onToggle: (r: GenericDmRow) => void | Promise<void>,
  openEdit: (r: GenericDmRow) => void,
  onSoftDelete?: (r: GenericDmRow) => void | Promise<void>,
): Column<GenericDmRow>[] {
  const showActions = canMutate || (canDelete && onSoftDelete);
  return [
    { 
      header: "Mã", 
      accessorKey: maCol, 
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200/50">
          {String(row[maCol] || "---")}
        </span>
      )
    },
    { 
      header: "Tên danh mục", 
      accessorKey: tenCol, 
      sortable: true,
      cell: (row) => (
        <span className="text-[11px] font-black text-[#026f17] uppercase tracking-tight">
          {String(row[tenCol] || "---")}
        </span>
      )
    },
    {
      header: "Trạng thái",
      accessorKey: "is_active",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${row.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${row.is_active ? "text-emerald-600" : "text-slate-400"}`}>
            {row.is_active ? "Đang dùng" : "Tạm ngưng"}
          </span>
        </div>
      ),
    },
    {
      header: "Cập nhật",
      accessorKey: "updated_at",
      sortable: true,
      cell: (row) => (
        <span className="text-[9px] font-bold text-slate-400 uppercase italic">
          {row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString("vi-VN") : "---"}
        </span>
      )
    },
    {
      header: "Thao tác",
      accessorKey: "id",
      cell: (row) =>
        showActions ? (
          <div className="flex justify-end gap-1.5">
            {canMutate && (
              <button
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#026f17]/5 text-[#026f17] transition-all hover:bg-[#026f17] hover:text-white"
                onClick={() => openEdit(row)}
                title="Sửa thông tin"
              >
                <Pencil size={14} />
              </button>
            )}
            {canDelete && onSoftDelete && (
              <button
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                onClick={() => void onSoftDelete(row)}
                title="Xóa dữ liệu"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[9px] font-bold uppercase text-slate-300">—</span>
        ),
    },
  ];
}
