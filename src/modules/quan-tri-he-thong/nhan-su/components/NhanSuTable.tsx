// src/modules/quan-tri-he-thong/nhan-su/components/NhanSuTable.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getNhanSus, getNhanSuExportData, getNhanSuFormOptionsAction } from "../actions/nhan-su-read.actions";
import type { NhanSu } from "../types";
import NhanSuForm from "./NhanSuForm";
import { useImportExport } from "@/hooks/useImportExport";
import { useMasterDataCrud } from "@/hooks/useMasterDataCrud";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import { smartImportData } from "../../danh-muc/actions/smart-import.actions";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { Users, Download, Upload, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const NHAN_SU_PAGE_SIZE = 20;

/** Không truyền = full quyền (legacy). Trường `false` tước quyền tương ứng. */
export type NhanSuTablePermission = Partial<{
  import: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}>;

type NhanSuTableProps = { refreshKey?: number; permission?: NhanSuTablePermission };

export default function NhanSuTable({ refreshKey: externalRefresh, permission }: NhanSuTableProps) {
  const router = useRouter();
  const [data, setData] = useState<NhanSu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, _setSearch] = useState("");
  const [khoaFilter, _setKhoaFilter] = useState("Tất cả");
  const [toFilter, _setToFilter] = useState("Tất cả");
  const [chucVuFilter, _setChucVuFilter] = useState("Tất cả");
  const [chucDanhFilter, _setChucDanhFilter] = useState("Tất cả");
  const [vaiTroFilter, _setVaiTroFilter] = useState("Tất cả");
  const [ngheNghiepFilter, _setNgheNghiepFilter] = useState("Tất cả");
  const [_khoas, setKhoas] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_tos, setTos] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_chucVus, setChucVus] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_chucDanhs, setChucDanhs] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_vaiTros, setVaiTros] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_ngheNghieps, setNgheNghieps] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NhanSu | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const filterKey = useMemo(
    () =>
      [
        search,
        khoaFilter,
        toFilter,
        chucVuFilter,
        chucDanhFilter,
        vaiTroFilter,
        ngheNghiepFilter,
      ].join("\0"),
    [search, khoaFilter, toFilter, chucVuFilter, chucDanhFilter, vaiTroFilter, ngheNghiepFilter],
  );

  const [syncedFilterKey, setSyncedFilterKey] = useState(filterKey);
  if (filterKey !== syncedFilterKey) {
    setSyncedFilterKey(filterKey);
    setPage(1);
  }

  const allowImport = permission?.import !== false;
  const allowCreate = permission?.create !== false;
  const allowEdit = permission?.edit !== false;
  const allowDelete = permission?.delete !== false;

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getNhanSus({
      search,
      khoaId: khoaFilter,
      toId: toFilter,
      chucVuId: chucVuFilter,
      chucDanhId: chucDanhFilter,
      vaiTroId: vaiTroFilter,
      ngheNghiepId: ngheNghiepFilter,
      page,
      pageSize: NHAN_SU_PAGE_SIZE,
    });
    if (res.success) {
      setData(res.data || []);
      setTotalCount(res.totalCount ?? res.total ?? 0);
    }
    setLoading(false);
  }, [
    search,
    khoaFilter,
    toFilter,
    chucVuFilter,
    chucDanhFilter,
    vaiTroFilter,
    ngheNghiepFilter,
    page,
  ]);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await getNhanSuFormOptionsAction();
      if (!res.success) return;
      setKhoas(res.data.khoas || []);
      setTos(res.data.tos || []);
      setChucVus(res.data.chucVus || []);
      setChucDanhs(res.data.chucDanhs || []);
      setVaiTros(res.data.vaiTros || []);
      setNgheNghieps(res.data.ngheNghieps || []);
    };
    void loadFilters();
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadData();
    });
  }, [loadData, refreshKey, externalRefresh]);
  const crud = useMasterDataCrud<NhanSu>({
    tableName: "mdm_nhan_su",
    codeField: "ma_nv",
    mainField: "ho_ten",
    entityLabel: "nhân sự",
    onSuccess: () => setRefreshKey((k) => k + 1),
  });
  const actionUi = useTableActionUi<NhanSu>({
    onToggleStatus: crud.toggleStatus,
    onEdit: (item) => {
      setEditingItem(item);
      setIsFormOpen(true);
    },
    onDelete: crud.softDelete,
    capabilities: { edit: allowEdit, delete: allowDelete, toggleActive: allowEdit },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "NHAN_SU", tableName: "mdm_nhan_su", displayName: "Nhân sự", uniqueKey: "ma_nv",
    columnMapping: {
      "Mã NV": "ma_nv",
      "Tên Nhân viên": "ho_ten",
      "Mã chức danh": "ma_chuc_danh",
      "Mã chức vụ": "ma_chuc_vu",
      "Mã vai trò KSNK": "ma_vai_tro_ksnk",
      "Email": "email",
      "SĐT": "so_dien_thoai",
      "Mã khoa": "ma_khoa",
      "Mã nghề nghiệp": "ma_nghe_nghiep",
      "Mã tổ": "ma_to",
      "Tên tổ (ghép import)": "ten_to_cong_tac",
      "is_active": "is_active",
    },
    onGetData: getNhanSuExportData,
    onImport: (d) => smartImportData({ tableName: "mdm_nhan_su", uniqueKey: "ma_nv", codePrefix: "NV" }, d),
    onSuccess: () => { setRefreshKey(k => k + 1); router.refresh(); }
  });

  const columns: Column<NhanSu>[] = [
    { 
      header: "NHÂN VIÊN", 
      accessorKey: "ho_ten", 
      sortable: true, 
      cell: (i) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-full bg-[#026f17]/10 flex items-center justify-center text-[#026f17] font-black text-xs border border-[#026f17]/5">
            {i.ho_ten?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-black text-slate-700 uppercase text-[11px] tracking-tight">{i.ho_ten}</div>
            <div className="text-[9px] font-bold text-[#026f17] uppercase tracking-widest bg-[#026f17]/5 px-1.5 rounded-sm w-fit mt-0.5">{i.ma_nv}</div>
          </div>
        </div>
      )
    },
    { 
      header: "PHÂN BỔ", 
      accessorKey: "khoa", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
            {i.khoa?.ten_khoa || "---"}
          </span>
          {i.to?.ten_danh_muc && (
            <span className="text-[9px] font-bold text-amber-500 uppercase italic">
              ↳ {i.to.ten_danh_muc}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "CHỨC VỤ & DANH", 
      accessorKey: "chuc_danh", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase w-fit">
            {i.chuc_danh || "Chưa gán"}
          </span>
          {i.chuc_vu && (
            <span className="text-[9px] font-bold text-slate-400 italic ml-0.5">
              {i.chuc_vu}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "NGHỀ NGHIỆP", 
      accessorKey: "nghe_nghiep_id", 
      sortable: true, 
      cell: (i) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          {i.nghe_nghiep?.ten_nghe_nghiep || "---"}
        </span>
      )
    },
    { header: "TRẠNG THÁI", accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: "QUẢN LÝ", accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) }
  ];

  const showForm =
    isFormOpen && ((editingItem != null && allowEdit) || (editingItem == null && allowCreate));

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-center bg-white/50 p-4 rounded-[28px] border border-slate-100 backdrop-blur-md gap-4">
        <div className="flex items-center gap-3 ml-2">
          <div className="p-2 bg-[#026f17] rounded-xl text-white shadow-lg shadow-[#026f17]/20">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">Danh sách nhân sự</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Hệ thống KSNK 103</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {allowImport && (
            <>
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".xlsx, .xls" className="hidden" />
              <button type="button" onClick={() => triggerImport()} disabled={isImporting} className="h-10 px-4 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all hover:bg-amber-100 active:scale-95">
                {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
              </button>
            </>
          )}
          <button type="button" onClick={() => exportTemplate()} className="h-10 px-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all hover:bg-slate-100 active:scale-95">
            <Download size={14} /> Mẫu Excel
          </button>
          {allowCreate && (
            <button type="button" onClick={() => { setEditingItem(null); setIsFormOpen(true); }} className="h-10 px-5 bg-[#026f17] text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-[#026f17]/20 flex items-center gap-2 transition-all hover:translate-y-[-1px] active:scale-95">
              <Plus size={16} /> Thêm nhân sự
            </button>
          )}
        </div>
      </header>

      <div className="bg-white p-2 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          hideSearch={true}
          enableMultiSelect={allowDelete}
          onDeleteSelected={allowDelete ? crud.softDeleteMany : undefined}
          serverPagination={{
            page,
            totalPages: Math.max(1, Math.ceil(totalCount / NHAN_SU_PAGE_SIZE)),
            totalCount,
            pageSize: NHAN_SU_PAGE_SIZE,
            onPageChange: setPage,
          }}
        />
      </div>
      {showForm ? (
        <NhanSuForm
          initialData={editingItem}
          onSuccess={() => { setIsFormOpen(false); setRefreshKey((k) => k + 1); }}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
