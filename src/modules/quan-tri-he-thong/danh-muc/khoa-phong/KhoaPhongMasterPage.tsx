// src/modules/quan-tri-he-thong/danh-muc/khoa-phong/KhoaPhongMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus, Building2, Download, Upload, Loader2 } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import KhoaPhongFormModal from "./khoa-phong-form-modal";
import { KHOA_PHONG_COLUMN_MAP } from "./khoa-phong-import";
import { getKhoaPhongColumns } from "./khoa-phong-columns";
import type { KhoaPhongRow } from "../actions/khoa-phong.actions";
import {
  getKhoiKhoaOptionsAction,
  getKhoaPhongRowsAction,
  softDeleteKhoaPhongAction,
  softDeleteManyKhoaPhongAction,
  toggleKhoaPhongStatusAction,
} from "../actions/khoa-phong.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

function KhoaPhongMasterPageContent() {
  const router = useRouter();
  const [data, setData] = useState<KhoaPhongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaPhongRow | null>(null);
  const [khoiOptions, setKhoiOptions] = useState<{ id: string; ten_danh_muc: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getKhoaPhongRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được danh mục khoa phòng.");
      setData(result.success ? result.data : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    (async () => {
      const result = await getKhoiKhoaOptionsAction();
      if (!result.success) {
        toast.error(result.error || "Không tải được danh mục khối khoa.");
        return;
      }
      setKhoiOptions(result.data);
    })();
  }, []);

  const actionUi = useTableActionUi<KhoaPhongRow>({
    onToggleStatus: async (row) => {
      const result = await toggleKhoaPhongStatusAction(row.id, Boolean(row.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: (row) => {
      setEditing(row);
      setFormOpen(true);
    },
    onDelete: async (row) => {
      if (!window.confirm(`Xóa cứng khoa phòng ${row.ma_danh_muc || row.id}?`)) return;
      const result = await softDeleteKhoaPhongAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa cứng.");
        return;
      }
      toast.success("Đã xóa cứng dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "KHOA_PHONG",
    tableName: "dm_khoa_phong",
    displayName: "Khoa phòng",
    uniqueKey: "ma_khoa",
    columnMapping: KHOA_PHONG_COLUMN_MAP,
    onGetData: () => getMasterDataExport("dm_khoa_phong", "ma_khoa"),
    onImport: (d) => smartImportData({ tableName: "dm_khoa_phong", uniqueKey: "ma_khoa", codePrefix: "KP" }, d),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });
  const columns = getKhoaPhongColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm gap-4">
        <div><h1 className="text-2xl font-black text-[#026f17] uppercase tracking-tighter flex items-center gap-3"><Building2 /> Khoa phòng & Đơn vị</h1><p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 italic leading-none">V5.0 FINAL — Standardized Sync</p></div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".xlsx, .xls" className="hidden" />
          <button onClick={triggerImport} disabled={isImporting} className="h-12 px-5 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 touch-manipulation">{isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu</button>
          <button onClick={() => exportTemplate()} className="h-12 px-5 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-slate-100 touch-manipulation"><Download size={16} /> Export dữ liệu mẫu</button>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="h-12 px-6 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90 touch-manipulation"><Plus size={18} /> Thêm mới</button>
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
            if (!window.confirm(`Xóa cứng ${rows.length} khoa phòng?`)) return;
            const result = await softDeleteManyKhoaPhongAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa cứng dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      <KhoaPhongFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        khoiOptions={khoiOptions}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function KhoaPhongMasterPage() {
  return (
    <DmMasterPageGuard moduleKey="KHOA_PHONG" label="Danh mục Khoa phòng">
      <KhoaPhongMasterPageContent />
    </DmMasterPageGuard>
  );
}
