// src/modules/quan-tri-he-thong/bang-kiem/components/TieuChiTable.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTieuChis, deleteTieuChi, saveTieuChi, deleteMultipleTieuChis, toggleIsActive } from "../actions/bang-kiem.actions";
import { importFullBangKiemData } from "../actions/bang-kiem-import.actions";
import { toast } from "sonner";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import TieuChiForm from "./TieuChiForm";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import type { DanhMucBangKiem, TieuChiBangKiem } from "../bang-kiem.types";
import { getTieuChiTableColumns } from "./tieu-chi-table-columns";
import TieuChiTableToolbar from "./tieu-chi-table-toolbar";

export type TieuChiTablePermission = Partial<{
  import: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}>;

export default function TieuChiTable({
  bangKiem,
  permission,
}: {
  bangKiem: Pick<DanhMucBangKiem, "id" | "ma_bk">;
  permission?: TieuChiTablePermission;
}) {
  const router = useRouter();
  const [data, setData] = useState<TieuChiBangKiem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTC, setEditingTC] = useState<TieuChiBangKiem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allowImport = permission?.import !== false;
  const allowCreate = permission?.create !== false;
  const allowEdit = permission?.edit !== false;
  const allowDelete = permission?.delete !== false;

  const loadData = async () => {
    setLoading(true);
    const res = await getTieuChis(bangKiem.id);
    if (res.success) setData(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadData();
    });
  }, [bangKiem.id, refreshKey]);

  const handleBulkDelete = async (items: TieuChiBangKiem[]) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${items.length} tiêu chí đã chọn?`)) return;
    const ids = items.map((i) => i.id);
    const res = await deleteMultipleTieuChis(ids);
    if (res.success) {
      toast.success("Đã xóa các mục chọn");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.error);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleIsActive("dm_tieu_chi_bang_kiem", id, currentStatus);
    if (res.success) setRefreshKey((prev) => prev + 1);
    else toast.error(res.error);
  };

  const actionUi = useTableActionUi<TieuChiBangKiem>({
    onToggleStatus: async (tc) => handleToggle(tc.id, Boolean(tc.is_active)),
    onEdit: (tc) => {
      setEditingTC(tc);
      setIsFormOpen(true);
    },
    onDelete: async (tc) => {
      if (!window.confirm("Bạn có chắc chắn muốn xóa tiêu chí này?")) return;
      await deleteTieuChi(bangKiem.id, tc.id);
      setRefreshKey((prev) => prev + 1);
    },
    capabilities: { edit: allowEdit, delete: allowDelete, toggleActive: allowEdit },
  });

  const columns = getTieuChiTableColumns(actionUi);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { exportTemplate, handleFileUpload, isImporting } = useImportExport({
    moduleKey: "BANG_KIEM_DETAIL",
    tableName: `tieu_chi_${bangKiem.ma_bk}`,
    displayName: `Tiêu chí ${bangKiem.ma_bk}`,
    uniqueKey: "ma_bk",
    isHierarchical: true,
    childUniqueKey: "ma_tc",
    childArrayKey: "tieu_chi_bang_kiem",
    columnMapping: {
      ma_bk: "ma_bk",
      ten_bang_kiem: "ten_bang_kiem",
      mo_ta_bang_kiem: "mo_ta",
      nhom_chuyen_de: "nhom_chuyen_de",
      ma_tc: "ma_tc",
      noi_dung_tieu_chi: "noi_dung",
      stt: "stt",
      ghi_chu: "ghi_chu",
      is_active: "is_active",
    },
    onImport: async (val) => {
      const res = await importFullBangKiemData(val);
      if (res.success) {
        setRefreshKey((prev) => prev + 1);
        router.refresh();
      }
      return res;
    },
  });

  const onExportWithData = () => {
    const exportData = [{ ...bangKiem, tieu_chi_bang_kiem: data }];
    exportTemplate(exportData);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const showForm =
    isFormOpen && ((editingTC != null && allowEdit) || (editingTC == null && allowCreate));

  return (
    <div className="premium-card glass-panel p-0 h-auto border-[#026f17]/20 bg-white shadow-2xl relative">
      <TieuChiTableToolbar
        fileInputRef={fileInputRef}
        isImporting={isImporting}
        allowImport={allowImport}
        allowCreate={allowCreate}
        onExportTemplate={onExportWithData}
        onAdd={() => {
          setEditingTC(null);
          setIsFormOpen(true);
        }}
        onFileChange={onFileChange}
      />
      <AdvancedDataTable
        columns={columns}
        data={data}
        loading={loading}
        enableMultiSelect={allowDelete}
        onDeleteSelected={allowDelete ? handleBulkDelete : undefined}
      />
      {showForm ? (
        <TieuChiForm
          initialData={editingTC}
          bangKiemId={bangKiem.id}
          onClose={() => setIsFormOpen(false)}
          onSave={async (val) => {
            const res = await saveTieuChi(val);
            if (res.success) {
              setIsFormOpen(false);
              setRefreshKey((prev) => prev + 1);
              router.refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
