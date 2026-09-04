"use client";

import React, { useEffect, useState } from "react";
import { Plus, Settings } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { toast } from "sonner";
import ThietBiFormModal from "./thiet-bi-form-modal";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { getThietBiColumns } from "./thiet-bi-columns";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import {
  getThietBiRowsAction,
  softDeleteManyThietBiAction,
  softDeleteThietBiAction,
  toggleThietBiStatusAction,
} from "../actions/thiet-bi.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";

function ThietBiMasterPageContent({ suppressHeader = false }: { suppressHeader?: boolean }) {
  const [data, setData] = useState<ThietBiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ThietBiRow | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getThietBiRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được danh mục thiết bị.");
      setData(result.success ? result.data : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: ThietBiRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const actionUi = useTableActionUi<ThietBiRow>({
    onToggleStatus: async (row) => {
      const result = await toggleThietBiStatusAction(row.id, Boolean(row.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: openEdit,
    onDelete: async (row) => {
      if (!window.confirm(`Xóa mềm thiết bị ${row.ma_thiet_bi || row.id}?`)) return;
      const result = await softDeleteThietBiAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa mềm.");
        return;
      }
      toast.success("Đã xóa mềm dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "THIET_BI",
    tableName: "cssd_dm_thiet_bi",
    displayName: "Thiết bị",
    uniqueKey: "ma_thiet_bi",
    columnMapping: {
      "Mã thiết bị": "ma_thiet_bi",
      "Tên thiết bị": "ten_thiet_bi",
      "Loại máy tiệt khuẩn": "ten_loai_may",
      "Ngày sử dụng": "ngay_dua_vao_su_dung",
      "Chu kỳ bảo trì (ngày)": "chu_ky_bao_tri_ngay",
      is_active: "is_active",
    },
    onGetData: () => getMasterDataExport("cssd_dm_thiet_bi", "ma_thiet_bi"),
    onImport: (d, options) =>
      smartImportData({ tableName: "cssd_dm_thiet_bi", uniqueKey: "ma_thiet_bi" }, d, {
        softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun,
      }),
    onSuccess: () => setRefreshKey((k) => k + 1),
  });

  const columns = getThietBiColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  const importButtons = (
    <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
      <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Excel</summary>
      <div className="pt-2">
        <ImportExportToolbar
          fileInputRef={fileInputRef}
          isImporting={isImporting}
          onExport={() => void exportTemplate()}
          onImportClick={triggerImport}
          onFileChange={(file) => void handleFileUpload(file)}
          exportClassName={T.btnSecondary}
          importClassName={T.btnSecondary}
        />
      </div>
    </details>
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-700">
      {!suppressHeader && (
        <KsnkListPageHeader
          icon={Settings}
          title="Thiết bị và máy"
          eyebrow="Danh mục master · Mã thiết bị = tem QR gắn suốt vòng đời"
          actions={
            <>
              {importButtons}
              <button type="button" onClick={openCreate} className={C.ctaPrimary}>
                <Plus size={18} /> Thêm mới
              </button>
            </>
          }
        />
      )}

      {/* Nếu suppressHeader là true, ta cần render lại các nút hành động (Add, Import) để không bị mất chức năng */}
      {suppressHeader && (
        <div className="flex flex-wrap justify-end gap-3 mb-4">
          {importButtons}
          <button type="button" onClick={openCreate} className={C.ctaPrimary}>
            <Plus size={16} /> Thêm thiết bị mới
          </button>
        </div>
      )}

      
      
      <div className="min-w-0 sm:min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
          bodyMaxHeight="max-h-[min(58dvh,560px)]"
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Xóa mềm ${rows.length} thiết bị?`)) return;
            const result = await softDeleteManyThietBiAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa mềm dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      <ThietBiFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function ThietBiMasterPage({ suppressHeader = false }: { suppressHeader?: boolean } = {}) {
  return (
    <DmMasterPageGuard moduleKey="THIET_BI" label="Danh mục Thiết bị">
      <ThietBiMasterPageContent suppressHeader={suppressHeader} />
    </DmMasterPageGuard>
  );
}
