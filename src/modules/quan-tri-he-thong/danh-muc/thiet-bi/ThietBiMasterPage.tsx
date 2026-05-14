"use client";

import React, { useEffect, useState } from "react";
import { Plus, Settings, Download, Upload, Loader2 } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ThietBiFormModal from "./thiet-bi-form-modal";
import { THIET_BI_COLUMN_MAP } from "./thiet-bi-import";
import { getThietBiColumns } from "./thiet-bi-columns";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import {
  getThietBiRowsAction,
  softDeleteManyThietBiAction,
  softDeleteThietBiAction,
  toggleThietBiStatusAction,
} from "../actions/thiet-bi.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

function ThietBiMasterPageContent() {
  const router = useRouter();
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
    tableName: "dm_thiet_bi",
    displayName: "Thiết bị",
    uniqueKey: "ma_thiet_bi",
    columnMapping: THIET_BI_COLUMN_MAP,
    onGetData: () => getMasterDataExport("dm_thiet_bi", "ma_thiet_bi"),
    onImport: (d) => smartImportData({ tableName: "dm_thiet_bi", uniqueKey: "ma_thiet_bi", codePrefix: "TB" }, d),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getThietBiColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#026f17] uppercase tracking-tighter flex items-center gap-3">
            <Settings /> Thiết bị và Máy
          </h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 italic leading-none">
            Master dm_thiet_bi
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            type="button"
            onClick={triggerImport}
            disabled={isImporting}
            className="h-12 px-5 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 touch-manipulation"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu
          </button>
          <button
            type="button"
            onClick={() => exportTemplate()}
            className="h-12 px-5 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-slate-100 touch-manipulation"
          >
            <Download size={16} /> Export dữ liệu mẫu
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="h-12 px-6 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90 touch-manipulation"
          >
            <Plus size={18} /> Thêm mới
          </button>
        </div>
      </header>
      <div className="bg-white p-2 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
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

export default function ThietBiMasterPage() {
  return (
    <DmMasterPageGuard moduleKey="THIET_BI" label="Danh mục Thiết bị">
      <ThietBiMasterPageContent />
    </DmMasterPageGuard>
  );
}
