"use client";

import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { TieuChiBangKiem } from "../bang-kiem.types";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

type ActionUi = {
  renderStatusCell: (tc: TieuChiBangKiem) => ReactNode;
  renderManagementCell: (tc: TieuChiBangKiem) => ReactNode;
};

export function getTieuChiTableColumns(actionUi: ActionUi): Column<TieuChiBangKiem>[] {
  return [
    {
      header: TH.stt,
      accessorKey: "stt",
      sortable: true,
      cell: (tc) => <span className={TC.cellIndex}>{tc.stt}</span>,
    },
    {
      header: TH.criteriaContent,
      accessorKey: "noi_dung",
      sortable: true,
      cell: (tc) => (
        <div className="w-full min-w-[200px] py-2">
          <div className={`${TC.cellBody} whitespace-normal`}>{String(tc.noi_dung ?? "")}</div>
          {tc.ghi_chu ? (
            <div className={`${TC.cellNote} mt-1`}>Lưu ý: {String(tc.ghi_chu)}</div>
          ) : null}
        </div>
      ),
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      cell: (tc) => actionUi.renderStatusCell(tc),
    },
    { header: TH.manage, accessorKey: "id", cell: (tc) => actionUi.renderManagementCell(tc) },
  ];
}
