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
};

export default function GenericDmMasterDataTable({
  columns,
  rows,
  loading,
  canDelete,
  registryKey,
  onReload,
  onRowClick,
}: Props) {
  return (
    <div className="bg-white p-2 rounded-[40px] border border-slate-100 shadow-sm min-h-[400px]">
      <AdvancedDataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={onRowClick}
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
