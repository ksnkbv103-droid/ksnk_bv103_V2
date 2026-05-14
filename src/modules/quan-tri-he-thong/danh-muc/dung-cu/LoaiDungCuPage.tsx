"use client";
import React, { useEffect, useState } from "react";
import { Plus, LayoutGrid, Download, Upload, Loader2 } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LoaiDungCuFormModal from "./loai-dung-cu-form-modal";
import {
  getLoaiDungCuRowsAction,
  softDeleteLoaiDungCuAction,
  softDeleteManyLoaiDungCuAction,
  toggleLoaiDungCuStatusAction,
} from "../actions/loai-dung-cu.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

type LoaiDungCuRow = {
  id: string;
  ma_danh_muc?: string;
  ten_danh_muc?: string;
  hinh_dang?: string | null;
  kich_thuoc?: string | null;
  cong_dung?: string | null;
  kha_nang_chiu_nhiet?: string | null;
  phuong_phap_tiet_khuan?: string | null;
  is_active?: boolean;
};

function LoaiDungCuPageContent() {
  const router = useRouter();
  const [data, setData] = useState<LoaiDungCuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const modalKey = editing?.id ? `edit-${String(editing.id)}` : "create";

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getLoaiDungCuRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được loại dụng cụ.");
      setData(result.success ? result.data ?? [] : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const actionUi = useTableActionUi<LoaiDungCuRow>({
    onToggleStatus: async (item) => {
      const result = await toggleLoaiDungCuStatusAction(item.id, Boolean(item.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: (item) => { setEditing(item); setIsFormOpen(true); },
    onDelete: async (item) => {
      if (!window.confirm(`Xóa mềm loại ${item.ma_danh_muc || item.id}?`)) return;
      const result = await softDeleteLoaiDungCuAction(item.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa.");
        return;
      }
      toast.success("Đã xóa mềm dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "LOAI_DC", tableName: "dm_loai_dung_cu", displayName: "Loại dụng cụ", uniqueKey: "ma_loai_dung_cu",
    columnMapping: { "Mã Loại": "ma_loai_dung_cu", "Tên Loại": "ten_loai_dung_cu", "Hình dáng": "hinh_dang", "Kích thước": "kich_thuoc", "Công dụng": "cong_dung", "Chịu nhiệt": "kha_nang_chiu_nhiet", "Tiệt khuẩn": "phuong_phap_tiet_khuan", "is_active": "is_active" },
    onGetData: () => getMasterDataExport("dm_loai_dung_cu", "ma_loai_dung_cu"),
    onImport: (d) => smartImportData({ tableName: "dm_loai_dung_cu", uniqueKey: "ma_loai_dung_cu", codePrefix: "LDC" }, d),
    onSuccess: () => { setRefreshKey(k => k + 1); router.refresh(); }
  });

  const columns: Column<LoaiDungCuRow>[] = [
    { header: "MÃ LOẠI", accessorKey: "ma_danh_muc", sortable: true, cell: (i) => (
      <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
        {i.ma_danh_muc}
      </span>
    )},
    { header: "TÊN LOẠI DỤNG CỤ", accessorKey: "ten_danh_muc", sortable: true, cell: (i) => (
      <div className="font-black text-[#026f17] uppercase text-[11px] leading-tight">
        {i.ten_danh_muc}
      </div>
    )},

    { header: "LOGIC TIỆT KHUẨN", accessorKey: "phuong_phap_tiet_khuan", sortable: true, cell: (i) => (
      <div className="text-[9px] font-bold uppercase space-y-0.5"><div className={i.kha_nang_chiu_nhiet==='Cao'?'text-emerald-600':'text-amber-600'}>Nhiệt: {i.kha_nang_chiu_nhiet}</div><div className="text-blue-600 font-black">{i.phuong_phap_tiet_khuan}</div></div>
    )},
    { header: "TRẠNG THÁI", accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: "QUẢN LÝ", accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div><h1 className="text-2xl font-black text-[#026f17] uppercase tracking-tighter flex items-center gap-3"><LayoutGrid /> Loại dụng cụ</h1><p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 italic leading-none">V5.0 FINAL — Standardized Sync</p></div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".xlsx, .xls" className="hidden" />
          <button onClick={triggerImport} disabled={isImporting} className="h-12 px-5 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">{isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu</button>
          <button onClick={() => exportTemplate()} className="h-12 px-5 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all hover:bg-slate-100 active:scale-95"><Download size={16} /> Export dữ liệu mẫu</button>
          <button onClick={() => { setEditing(null); setIsFormOpen(true); }} className="h-12 px-6 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"><Plus size={18} /> Thêm mới</button>
        </div>
      </header>
      <div className="bg-white p-2 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
          onDeleteSelected={async (items) => {
            if (!items.length) return;
            if (!window.confirm(`Xóa mềm ${items.length} loại dụng cụ?`)) return;
            const result = await softDeleteManyLoaiDungCuAction(items.map((x) => x.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa mềm dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      <LoaiDungCuFormModal
        key={modalKey}
        open={isFormOpen}
        initialData={editing}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function LoaiDungCuPage() {
  return (
    <DmMasterPageGuard moduleKey="LOAI_DC" label="Danh mục Loại dụng cụ">
      <LoaiDungCuPageContent />
    </DmMasterPageGuard>
  );
}
