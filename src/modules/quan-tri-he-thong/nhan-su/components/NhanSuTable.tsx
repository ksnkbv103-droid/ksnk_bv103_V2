// src/modules/quan-tri-he-thong/nhan-su/components/NhanSuTable.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getNhanSus, getNhanSuFormOptionsAction } from "../actions/nhan-su-read.actions";
import type { NhanSu } from "../types";
import NhanSuForm from "./NhanSuForm";
import { useMasterDataCrud } from "@/hooks/useMasterDataCrud";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { Upload, Plus } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import MasterDataImportExportModal from "../../components/MasterDataImportExportModal";

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
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // Removed legacy useImportExport hook to improve bundle size and maintain cleanliness

  const columns: Column<NhanSu>[] = [
    { 
      header: "Nhân viên",
      accessorKey: "ho_ten", 
      sortable: true, 
      cell: (i) => (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--primary)]/5 bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
            {i.ho_ten?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className={TC.cellTitle}>{i.ho_ten}</div>
            <div className={`${TC.cellCode} mt-0.5 w-fit rounded-sm bg-[var(--primary)]/5 px-1.5`}>{i.ma_nv}</div>
          </div>
        </div>
      )
    },
    { 
      header: "Phân bổ",
      accessorKey: "khoa", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-600">
            {i.khoa?.ten_khoa || "---"}
          </span>
          {i.to?.ten_danh_muc && (
            <span className="text-[11px] font-normal italic text-amber-600">
              ↳ {i.to.ten_danh_muc}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "Chức vụ & danh",
      accessorKey: "chuc_danh", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="w-fit rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            {i.chuc_danh || "Chưa gán"}
          </span>
          {i.chuc_vu && (
            <span className="ml-0.5 text-[11px] font-normal italic text-slate-400">
              {i.chuc_vu}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "Nghề nghiệp",
      accessorKey: "nghe_nghiep_id", 
      sortable: true, 
      cell: (i) => (
        <span className={TC.cellMeta}>
          {i.nghe_nghiep?.ten_nghe_nghiep || "---"}
        </span>
      )
    },
    { header: TH.status, accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: TH.manage, accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) },
  ];

  const showForm =
    isFormOpen && ((editingItem != null && allowEdit) || (editingItem == null && allowCreate));

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {(allowImport || allowCreate) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {allowImport && (
            <button type="button" onClick={() => setImportModalOpen(true)} className={bv103DesignTokens.btnSecondary}>
              <Upload size={14} aria-hidden /> Nhập/Xuất Excel
            </button>
          )}
          {allowCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className={bv103DesignTokens.btnPrimary}
            >
              <Plus size={16} aria-hidden /> Thêm nhân sự
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
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
      <MasterDataImportExportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        type="nhan-su"
      />
    </div>
  );
}
