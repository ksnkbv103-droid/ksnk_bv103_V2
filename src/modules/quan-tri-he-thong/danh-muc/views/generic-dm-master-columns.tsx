"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { formatDateVi } from "@/lib/format-datetime-vi";

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
        <span className={TC.cellCode}>
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
        <span className={row.is_active ? TC.statusOk : TC.statusMuted}>
          {row.is_active ? "Đang dùng" : "Tạm ngưng"}
        </span>
      ),
    },
    {
      header: "Cập nhật",
      accessorKey: "updated_at",
      sortable: true,
      headerClassName: "w-[14%] whitespace-nowrap",
      cellClassName: "whitespace-nowrap align-middle",
      cell: (row) => (
        <span className="bv103-type-note">
          {formatDateVi(row.updated_at ? String(row.updated_at) : null, "---")}
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
                className={`${C.tableIconBtn} bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white`}
                onClick={() => openEdit(row)}
                title="Sửa thông tin"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDelete && onSoftDelete && (
              <button
                type="button"
                className={`${C.tableIconBtn} bg-red-50 text-red-500 hover:bg-red-500 hover:text-white`}
                onClick={() => void onSoftDelete(row)}
                title="Xóa dữ liệu"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] font-medium text-slate-400">—</span>
        ),
    },
  ];
}
