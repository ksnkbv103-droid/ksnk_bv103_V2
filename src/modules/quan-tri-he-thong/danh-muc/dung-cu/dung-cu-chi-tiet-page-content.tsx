"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, List, Download, Upload, Loader2 } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DungCuChiTietFormModal from "./dung-cu-chi-tiet-form-modal";
import { getDungCuChiTietColumns } from "./dung-cu-chi-tiet-columns";
import { DC_CHI_TIET_COLUMN_MAP } from "./dung-cu-chi-tiet-import";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";
import {
  getBoDungCuOptionsForChiTietAction,
  getDungCuChiTietRowsAction,
  getLoaiDungCuOptionsForChiTietAction,
  softDeleteDungCuChiTietAction,
  softDeleteManyDungCuChiTietAction,
  toggleDungCuChiTietStatusAction,
} from "../actions/dung-cu-chi-tiet.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";

export function DungCuChiTietPageContent() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DungCuChiTietTableRow | null>(null);
  const [boOptions, setBoOptions] = useState<{ id: string; ma_bo: string | null; ten_bo: string | null }[]>([]);
  const [loaiOptions, setLoaiOptions] = useState<{ id: string; ma_danh_muc: string | null; ten_danh_muc: string | null }[]>([]);
  const [loadingBo, setLoadingBo] = useState(true);
  const [loadingLoai, setLoadingLoai] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBo(true);
      setLoadingLoai(true);
      const [boRes, loaiRes] = await Promise.all([
        getBoDungCuOptionsForChiTietAction(),
        getLoaiDungCuOptionsForChiTietAction(),
      ]);
      if (!alive) return;
      if (!boRes.success) toast.error("Không tải được danh sách bộ: " + boRes.error);
      setBoOptions(boRes.success ? boRes.data : []);
      setLoadingBo(false);
      if (!loaiRes.success) toast.error("Không tải được loại dụng cụ: " + loaiRes.error);
      setLoaiOptions(loaiRes.success ? loaiRes.data : []);
      setLoadingLoai(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fetchChiTietPage = useCallback(async (params: ServerPaginationParams) => {
    const result = await getDungCuChiTietRowsAction({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortKey: params.sortKey,
      sortDir: params.sortDir,
    });
    if (!result.success) {
      toast.error(result.error || "Không tải được dụng cụ chi tiết.");
      return { success: false as const, data: [], totalCount: 0, error: result.error };
    }
    return {
      success: true as const,
      data: (result.data || []) as DungCuChiTietTableRow[],
      totalCount: result.totalCount ?? 0,
    };
  }, []);

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    totalCount,
    searchTerm,
    handleSearch,
    handleSort,
    loading,
    refresh,
  } = useServerPaginatedTable<DungCuChiTietTableRow>({
    fetchAction: fetchChiTietPage,
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });

  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (row: DungCuChiTietTableRow) => { setEditing(row); setFormOpen(true); };

  const actionUi = useTableActionUi<DungCuChiTietTableRow>({
    onToggleStatus: async (row) => {
      const result = await toggleDungCuChiTietStatusAction(row.id, Boolean(row.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: openEdit,
    onDelete: async (row) => {
      if (!window.confirm(`Xóa mềm chi tiết ${row.ma_chi_tiet || row.id}?`)) return;
      const result = await softDeleteDungCuChiTietAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa mềm.");
        return;
      }
      toast.success("Đã xóa mềm dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "DC_LE",
    tableName: "cssd_dm_bo_dung_cu_chi_tiet",
    displayName: "Dụng cụ chi tiết",
    uniqueKey: "ma_chi_tiet",
    columnMapping: DC_CHI_TIET_COLUMN_MAP,
    onGetData: () => getMasterDataExport("cssd_dm_bo_dung_cu_chi_tiet", "ma_chi_tiet"),
    onImport: (d) =>
      smartImportData({ tableName: "cssd_dm_bo_dung_cu_chi_tiet", uniqueKey: "ma_chi_tiet", codePrefix: "DC" }, d),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getDungCuChiTietColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <KsnkListPageHeader
        icon={List}
        title="Dụng cụ chi tiết"
        eyebrow="Danh mục master · Chi tiết trong bộ dụng cụ"
        actions={
          <>
            <button type="button" onClick={triggerImport} disabled={isImporting} className={C.ctaAmber}>
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu
            </button>
            <button type="button" onClick={() => exportTemplate()} className={C.ctaMuted}>
              <Download size={16} /> Export dữ liệu mẫu
            </button>
            <button type="button" onClick={openCreate} className={C.ctaPrimary}>
              <Plus size={18} /> Thêm mới
            </button>
          </>
        }
      />
      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          onSearch={handleSearch}
          searchValue={searchTerm}
          onSort={(key) => handleSort(String(key))}
          enableMultiSelect={true}
          serverPagination={{
            page,
            totalPages,
            totalCount,
            pageSize,
            onPageChange: setPage,
          }}
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Xóa mềm ${rows.length} dòng chi tiết?`)) return;
            const result = await softDeleteManyDungCuChiTietAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa mềm dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>

      <DungCuChiTietFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        boOptions={boOptions}
        loaiOptions={loaiOptions}
        loadingBo={loadingBo}
        loadingLoai={loadingLoai}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
