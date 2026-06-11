"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

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
      headerClassName: "w-[18%] min-w-[5.5rem]",
      cellClassName: "align-middle",
      cell: (row) => (
        <span className={`${TC.cellCode} rounded-lg border border-slate-200/50 bg-slate-50 px-2 py-1`}>
          {String(row[maCol] || "---")}
        </span>
      )
    },
    { 
      header: "Tên danh mục",
      accessorKey: tenCol, 
      sortable: true,
      headerClassName: "min-w-0 w-[38%]",
      cellClassName: "min-w-0 align-middle",
      cell: (row) => (
        <span className={`block truncate ${TC.cellTitle}`}>{String(row[tenCol] || "---")}</span>
      )
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      headerClassName: "w-[15%] min-w-[7rem]",
      cellClassName: "align-middle",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${row.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"}`} />
          <span className={`text-[11px] font-medium ${row.is_active ? "text-emerald-600" : "text-slate-400"}`}>
            {row.is_active ? "Đang dùng" : "Tạm ngưng"}
          </span>
        </div>
      ),
    },
    {
      header: "Cập nhật",
      accessorKey: "updated_at",
      sortable: true,
      headerClassName: "w-[14%] whitespace-nowrap",
      cellClassName: "whitespace-nowrap align-middle",
      cell: (row) => (
        <span className="text-[11px] font-normal text-slate-400 italic">
          {row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString("vi-VN") : "---"}
        </span>
      )
    },
    {
      header: TH.manage,
      accessorKey: "id",
      headerClassName: "w-[15%] min-w-[5.5rem] text-right",
      cellClassName: "text-right align-middle",
      cell: (row) =>
        showActions ? (
          <div className="flex justify-end gap-1.5">
            {canMutate && (
              <button
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] transition-all hover:bg-[var(--primary)] hover:text-white"
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
          <span className="text-[11px] font-medium text-slate-400">—</span>
        ),
    },
  ];
}
