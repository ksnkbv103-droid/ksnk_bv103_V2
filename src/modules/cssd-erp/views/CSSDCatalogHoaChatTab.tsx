"use client";

import React, { useMemo } from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import { CSSD_UI_CELL_CODE } from "../shared/ui/cssd-ui-chrome";
import type { CSSDHoaChat } from "../types/catalog.types";

export function CSSDCatalogHoaChatTab({ hoaChatRows }: { hoaChatRows: CSSDHoaChat[] }) {
  const columns = useMemo<Column<CSSDHoaChat>[]>(
    () => [
      {
        header: "Mã",
        accessorKey: "ma_hoa_chat",
        sortable: true,
        headerClassName: bv103TableLayout.colMeta,
        cellClassName: bv103TableLayout.colMeta,
        cell: (x) => <span className={CSSD_UI_CELL_CODE}>{x.ma_hoa_chat || "—"}</span>,
      },
      {
        header: "Tên",
        accessorKey: "ten_hoa_chat",
        sortable: true,
        headerClassName: bv103TableLayout.colTitle,
        cellClassName: bv103TableLayout.colTitle,
        cell: (x) => (
          <span className="block truncate text-sm font-medium text-slate-800" title={x.ten_hoa_chat || undefined}>
            {x.ten_hoa_chat || "—"}
          </span>
        ),
      },
      {
        header: "Loại",
        accessorKey: "loai_hoa_chat",
        sortable: true,
        headerClassName: bv103TableLayout.colStatus,
        cellClassName: bv103TableLayout.colStatus,
        cell: (x) => (
          <span className="truncate text-[11px] text-slate-600">{x.loai_hoa_chat || "Vật tư"}</span>
        ),
      },
      {
        header: "Đvt",
        accessorKey: "don_vi_tinh",
        sortable: true,
        headerClassName: bv103TableLayout.colNarrow,
        cellClassName: bv103TableLayout.colNarrow,
        cell: (x) => (
          <span className="text-[11px] font-semibold text-slate-700">{x.don_vi_tinh || "—"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <AdvancedDataTable
      columns={columns}
      data={hoaChatRows}
      searchPlaceholder="Tìm mã, tên hóa chất…"
      emptyMessage="Chưa có hóa chất vật tư trong danh mục."
      bodyMaxHeight="max-h-[min(58dvh,560px)]"
      tableClassName={bv103TableLayout.tableFixed}
    />
  );
}
