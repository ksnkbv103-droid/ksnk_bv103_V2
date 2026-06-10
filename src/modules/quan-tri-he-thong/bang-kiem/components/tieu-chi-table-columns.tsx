"use client";

import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { TieuChiBangKiem } from "../bang-kiem.types";

type ActionUi = {
  renderStatusCell: (tc: TieuChiBangKiem) => ReactNode;
  renderManagementCell: (tc: TieuChiBangKiem) => ReactNode;
};

export function getTieuChiTableColumns(actionUi: ActionUi): Column<TieuChiBangKiem>[] {
  return [
    {
      header: "STT",
      accessorKey: "stt",
      sortable: true,
      cell: (tc) => <span className="font-black text-slate-400">{tc.stt}</span>,
    },
    {
      header: "Nội dung tiêu chí",
      accessorKey: "noi_dung",
      sortable: true,
      cell: (tc) => (
        <div className="w-full py-2 min-w-[200px]">
          <div className="text-xs font-black text-slate-700 leading-relaxed uppercase tracking-tight whitespace-normal">
            {String(tc.noi_dung ?? "")}
          </div>
          {tc.ghi_chu && (
            <div className="text-[11px] text-slate-400 mt-1 italic">Lưu ý: {String(tc.ghi_chu)}</div>
          )}
        </div>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "is_active",
      sortable: true,
      cell: (tc) => actionUi.renderStatusCell(tc),
    },
    { header: "Quản lý", accessorKey: "id", cell: (tc) => actionUi.renderManagementCell(tc) },
  ];
}
