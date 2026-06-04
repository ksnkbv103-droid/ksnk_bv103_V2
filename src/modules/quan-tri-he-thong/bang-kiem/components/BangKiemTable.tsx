// src/modules/quan-tri-he-thong/bang-kiem/components/BangKiemTable.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Upload, Loader2 } from "lucide-react";
import { getBangKiems, deleteBangKiem, saveBangKiem, getExportData, toggleIsActive } from "../actions/bang-kiem.actions";
import { importFullBangKiemData } from "../actions/bang-kiem-import.actions";
import { toast } from "sonner";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import BangKiemForm from "./BangKiemForm";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export type BangKiemTablePermission = Partial<{
  import: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}>;

/** Import phân cấp có tiêu chí: máy chủ yêu cầu thêm import `BANG_KIEM_DETAIL` khi có dòng con trong file. */
export default function BangKiemTable({
  onSelectBK,
  selectedBKId,
  permission,
}: {
  onSelectBK: (bk: DanhMucBangKiem) => void;
  selectedBKId?: string;
  permission?: BangKiemTablePermission;
}) {
  const router = useRouter();
  const allowImport = permission?.import !== false;
  const allowCreate = permission?.create !== false;
  const allowEdit = permission?.edit !== false;
  const allowDelete = permission?.delete !== false;

  const [data, setData] = useState<DanhMucBangKiem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBK, setEditingBK] = useState<DanhMucBangKiem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    setLoading(true);
    const res = await getBangKiems();
    if (res.success) setData((res.data || []) as DanhMucBangKiem[]);
    else toast.error(res.error || "Không tải được danh mục bảng kiểm");
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [refreshKey]);

  useEffect(() => {
    if (!selectedBKId && data.length > 0) {
      onSelectBK(data[0]);
    }
  }, [data, selectedBKId, onSelectBK]);

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "BANG_KIEM", tableName: "gstt_dm_bang_kiem", displayName: "Danh mục Bảng kiểm", uniqueKey: "ma_bk",
    isHierarchical: true, childUniqueKey: "ma_tc", childArrayKey: "tieu_chi_bang_kiem",
    columnMapping: {
      "ma_bk": "ma_bk",
      "ten_bang_kiem": "ten_bang_kiem",
      "mo_ta_bang_kiem": "mo_ta",
      "nhom_chuyen_de": "phan_loai_chuyen_mon",
      "ma_tc": "ma_tc",
      "noi_dung_tieu_chi": "noi_dung",
      "stt": "stt",
      "ghi_chu": "ghi_chu",
      "is_active": "is_active",
    },
    onGetData: getExportData,
    onImport: (val) => importFullBangKiemData(val),
    onSuccess: () => { setRefreshKey(k => k + 1); router.refresh(); }
  });
  const actionUi = useTableActionUi<DanhMucBangKiem>({
    onToggleStatus: async (bk) => {
      const res = await toggleIsActive("gstt_dm_bang_kiem", bk.id, bk.is_active ?? true);
      if (res.success) setRefreshKey((k) => k + 1);
      else toast.error(res.error || "Không thể cập nhật trạng thái");
    },
    onEdit: (bk) => {
      setEditingBK(bk);
      setIsFormOpen(true);
    },
    onDelete: async (bk) => {
      if (!window.confirm("Xóa mẫu này?")) return;
      await deleteBangKiem(bk.id);
      setRefreshKey((k) => k + 1);
    },
    capabilities: { edit: allowEdit, delete: allowDelete, toggleActive: allowEdit },
  });

  const columns: Column<DanhMucBangKiem>[] = [
    { header: "MÃ / TÊN BẢNG KIỂM", accessorKey: "ten_bang_kiem", sortable: true, cell: (bk) => (
      <div className="py-1"><div className="text-[10px] font-black text-[#026f17] uppercase tracking-widest">{bk.ma_bk}</div><div className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">{bk.ten_bang_kiem}</div></div>
    )},
    { header: "TRẠNG THÁI", accessorKey: "is_active", sortable: true, cell: (bk) => actionUi.renderStatusCell(bk) },
    { header: "QUẢN LÝ", accessorKey: "id", cell: (bk) => actionUi.renderManagementCell(bk) }
  ];

  const showForm =
    isFormOpen && ((editingBK != null && allowEdit) || (editingBK == null && allowCreate));

  return (
    <div className={`min-h-[400px] overflow-hidden p-0 animate-in fade-in ${bv103LayoutChrome.panelSurface}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white p-6">
        <div className="flex gap-3 flex-wrap">
          <button type="button" onClick={() => exportTemplate()} className="h-10 px-5 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm"><Download size={14} /> Export dữ liệu mẫu</button>
          {allowImport ? (
            <>
              <button type="button" onClick={() => triggerImport()} disabled={isImporting} className="h-10 px-5 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-amber-100 transition-all shadow-lg">{isImporting ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} /> Import dữ liệu</>}</button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </>
          ) : null}
        </div>
        {allowCreate ? (
          <button type="button" onClick={() => { setEditingBK(null); setIsFormOpen(true); }} className="h-10 px-6 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center gap-2 active:scale-95 transition-all"><Plus size={16} /> Thêm Bảng kiểm</button>
        ) : null}
      </div>
      <div className="px-4 pb-2 sm:px-6">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={allowDelete}
          onRowClick={(row) => onSelectBK(row)}
          rowClassName={(row) =>
            row.id === selectedBKId ? "bg-[#026f17]/5 border-l-4 border-l-[#026f17]" : ""
          }
          onDeleteSelected={
            allowDelete
              ? (items) => {
                  if (confirm(`Xóa ${items.length} bảng kiểm?`)) {
                    void Promise.all(items.map((i) => deleteBangKiem(i.id))).then(() =>
                      setRefreshKey((k) => k + 1),
                    );
                  }
                }
              : undefined
          }
        />
      </div>
      {showForm ? (
        <BangKiemForm
          initialData={editingBK ?? undefined}
          onClose={() => setIsFormOpen(false)}
          onSave={async (val) => {
            const res = await saveBangKiem(val as unknown as Record<string, unknown>);
            if (res.success) {
              toast.success("Đã cập nhật cơ sở dữ liệu");
              setIsFormOpen(false);
              setRefreshKey((k) => k + 1);
              router.refresh();
            } else toast.error(res.error);
          }}
        />
      ) : null}
    </div>
  );
}
