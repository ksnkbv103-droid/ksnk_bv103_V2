"use client";

import React, { useEffect, useState } from "react";
import { Plus, Settings, Wrench, CheckCircle2, Zap, Upload } from "lucide-react";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { toast } from "sonner";
import ThietBiFormModal from "./thiet-bi-form-modal";
import MasterDataImportExportModal from "../../components/MasterDataImportExportModal";
import { getThietBiColumns } from "./thiet-bi-columns";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import {
  getThietBiRowsAction,
  softDeleteManyThietBiAction,
  softDeleteThietBiAction,
  toggleThietBiStatusAction,
} from "../actions/thiet-bi.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

function ThietBiMasterPageContent({ suppressHeader = false }: { suppressHeader?: boolean }) {
  const [data, setData] = useState<ThietBiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // Removed legacy useImportExport hook to improve bundle size and maintain cleanliness

  const columns = getThietBiColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  const totalThietBi = data.length;
  const readyCount = data.filter((x) => {
    const s = (x.trang_thai || "READY").toUpperCase();
    return s === "READY" || s === "SAN_SANG";
  }).length;
  const repairingCount = data.filter((x) => {
    const s = (x.trang_thai || "").toUpperCase();
    return s === "REPAIRING" || s === "BAO_TRI";
  }).length;
  const totalMeTietKhuan = data.reduce((acc, x) => acc + (x.so_lan_su_dung || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {!suppressHeader && (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#026f17] uppercase tracking-tighter flex items-center gap-3">
              <Settings /> Thiết bị và Máy
            </h1>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 italic leading-none">
              Master dm_thiet_bi
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="h-12 px-5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 touch-manipulation"
            >
              <Upload size={16} /> Nhập/Xuất Excel
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
      )}

      {/* Nếu suppressHeader là true, ta cần render lại các nút hành động (Add, Import) để không bị mất chức năng */}
      {suppressHeader && (
        <div className="flex flex-wrap justify-end gap-3 mb-4">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="h-10 px-4 bg-emerald-50 text-emerald-600 rounded-lg font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-sm active:scale-95 touch-manipulation"
          >
            <Upload size={14} /> Nhập/Xuất Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-5 bg-[#026f17] text-[#FFD700] rounded-lg font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-sm active:scale-95 touch-manipulation"
          >
            <Plus size={16} /> Thêm thiết bị mới
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số máy móc</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalThietBi}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
            <Settings size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sẵn sàng vận hành</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{readyCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang bảo trì / sửa chữa</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{repairingCount}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 ${repairingCount > 0 ? "animate-pulse" : ""}`}>
            <Wrench size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng mẻ tiệt khuẩn</p>
            <p className="text-2xl font-black text-amber-600 mt-1">🔥 {totalMeTietKhuan}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Zap size={20} />
          </div>
        </div>
      </div>
      
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
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
      <MasterDataImportExportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        type="thiet-bi"
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
