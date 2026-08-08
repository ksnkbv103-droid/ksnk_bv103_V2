"use client";

import React from "react";
import AdvancedDataTable, { type Column } from "@/components/shared/AdvancedDataTable";
import { toast } from "sonner";
import { mdmSoftDeleteManyGenericDm } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { GenericDmRow } from "./generic-dm-master-columns";

type Props = {
  columns: Column<GenericDmRow>[];
  rows: GenericDmRow[];
  loading: boolean;
  canDelete: boolean;
  registryKey: string;
  onReload: () => void;
  onRowClick?: (row: GenericDmRow) => void;
  listSearch: string;
  onListSearchChange: (v: string) => void;
};

/** Ops list — ô tìm trong ADT (FLT-SEARCH-01). */
export default function GenericDmMasterDataTable({
  columns,
  rows,
  loading,
  canDelete,
  registryKey,
  onReload,
  onRowClick,
  listSearch,
  onListSearchChange,
}: Props) {
  return (
    <div className="min-h-[400px] rounded-[var(--radius-shell)] border border-slate-200 bg-white p-2 shadow-sm">
      <AdvancedDataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={onRowClick}
        searchPlaceholder="Tìm mã hoặc tên…"
        searchValue={listSearch}
        onSearch={onListSearchChange}
        tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
        enableMultiSelect={canDelete}
        onDeleteSelected={
          canDelete
            ? async (items) => {
                if (!items.length) return;
                if (!window.confirm(`Xóa mềm ${items.length} dòng đã chọn?`)) return;
                const res = await mdmSoftDeleteManyGenericDm(
                  registryKey,
                  items.map((x) => String(x.id))
                );
                if (!res.success) toast.error((res as { error?: string }).error || "Không xóa được.");
                else {
                  toast.success("Đã xóa mềm các dòng đã chọn.");
                  void onReload();
                }
              }
            : undefined
        }
      />
    </div>
  );
}
