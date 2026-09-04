"use client";
import React, { useEffect, useState } from "react";
import { Plus, LayoutGrid, ChevronLeft } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LoaiDungCuFormModal from "./loai-dung-cu-form-modal";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { LoaiDungCuChiTietPanel } from "./loai-dung-cu-chi-tiet-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  getLoaiDungCuRowsAction,
  softDeleteLoaiDungCuAction,
  softDeleteManyLoaiDungCuAction,
  toggleLoaiDungCuStatusAction,
} from "../actions/loai-dung-cu.actions";

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

type LoaiDungCuRow = {
  id: string;
  ma_danh_muc?: string;
  ten_danh_muc?: string;
  hinh_dang?: string | null;
  kich_thuoc?: string | null;
  cong_dung?: string | null;
  is_chiu_nhiet?: boolean;
  kha_nang_chiu_nhiet?: string | null;
  phan_loai_spaulding?: string | null;
  phan_loai_spaulding_label?: string | null;
  phuong_phap_tiet_khuan?: string | null;
  phuong_phap_tiet_khuan_label?: string | null;
  phan_loai?: string;
  so_luong_kho_du_phong?: number;
  so_luong_tong?: number;
  bo_dung_cu_chua?: { id: string; ma_bo: string | null; ten_bo: string | null }[];
  is_active?: boolean;
};

export function LoaiDungCuPageContent({ compact = false }: { compact?: boolean } = {}) {
  const router = useRouter();
  const { isAdmin } = useModulePermission("LOAI_DC");
  const canWriteMaster = isAdmin;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [selectedLoaiId, setSelectedLoaiId] = useState<string | null>(null);
  const modalKey = editing?.id ? `edit-${String(editing.id)}` : "create";

  const fetchAction = React.useCallback(async (params: ServerPaginationParams) => {
    const result = await getLoaiDungCuRowsAction(params);
    if (!result.success) toast.error(result.error || "Không tải được loại dụng cụ.");
    return { success: result.success, data: result.data ?? [], totalCount: result.totalCount ?? 0, error: result.error };
  }, []);
  const table = useServerPaginatedTable<LoaiDungCuRow>({
    fetchAction,
    defaultPageSize: 20,
    defaultSortKey: "ma_danh_muc",
    defaultSortDir: "asc",
  });
  const data = table.data;
  const loading = table.loading;

  useEffect(() => {
    if (selectedLoaiId && !data.some((r) => r.id === selectedLoaiId)) setSelectedLoaiId(null);
  }, [data, selectedLoaiId]);

  const actionUi = useTableActionUi<LoaiDungCuRow>({
    capabilities: { edit: canWriteMaster, delete: canWriteMaster, toggleActive: canWriteMaster },
    onToggleStatus: async (item) => {
      const result = await toggleLoaiDungCuStatusAction(item.id, Boolean(item.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      table.refresh();
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
      table.refresh();
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "LOAI_DC", tableName: "cssd_dm_loai_dung_cu", displayName: "Loại dụng cụ", uniqueKey: "ma_loai_dung_cu",
    columnMapping: {
      "Mã Loại": "ma_loai_dung_cu",
      "Tên Loại": "ten_loai_dung_cu",
      "Hình dáng": "hinh_dang",
      "Kích thước": "kich_thuoc",
      "Công dụng": "cong_dung",
      "Chịu nhiệt": "kha_nang_chiu_nhiet",
      "Spaulding": "phan_loai_spaulding",
      "Tiệt khuẩn": "phuong_phap_tiet_khuan",
      is_active: "is_active",
    },
    onGetData: () => getMasterDataExport("cssd_dm_loai_dung_cu", "ma_loai_dung_cu"),
    onImport: (d, options) =>
      smartImportData(
        { tableName: "cssd_dm_loai_dung_cu", uniqueKey: "ma_loai_dung_cu", codePrefix: "LDC" },
        d,
        { softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun },
      ),
    onSuccess: () => { table.refresh(); router.refresh(); }
  });

  const allColumns: Column<LoaiDungCuRow>[] = [
    { header: "Mã loại", accessorKey: "ma_danh_muc", sortable: true, cell: (i) => (
      <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-[11px] font-medium text-slate-500">
        {i.ma_danh_muc}
      </span>
    )},
    { header: "Tên loại dụng cụ", accessorKey: "ten_danh_muc", sortable: true, cell: (i) => (
      <div className="text-[11px] font-medium text-[var(--primary)] leading-tight">
        {i.ten_danh_muc}
      </div>
    )},
    { header: "Phân loại", accessorKey: "phan_loai", sortable: true, cell: (i) => (
      i.phan_loai === "THU_THUAT" ? (
        <span className="rounded-lg border border-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--surface-warning-text)]">Thủ thuật</span>
      ) : (
        <span className="rounded-lg border border-[var(--surface-success-border)] bg-[var(--surface-success-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--surface-success-text)]">Phẫu thuật</span>
      )
    )},
    { header: "Hình dáng", accessorKey: "hinh_dang", sortable: true, cell: (i) => (
      <span className="text-[11px] text-slate-600 font-semibold">{clip(i.hinh_dang, 28)}</span>
    )},
    { header: "Kích thước", accessorKey: "kich_thuoc", sortable: true, cell: (i) => (
      <span className="text-[11px] text-slate-600 font-semibold">{clip(i.kich_thuoc, 20)}</span>
    )},
    { header: "Tính năng / Công dụng", accessorKey: "cong_dung", sortable: true, cell: (i) => (
      <span className="text-[11px] text-slate-500 font-medium">{clip(i.cong_dung, 40)}</span>
    )},
    { header: "Số lượng kho lẻ / Tổng", accessorKey: "so_luong_tong", sortable: true, cell: (i) => (
      <div className="bv103-type-label font-semibold text-slate-600">
        Dự phòng: <span className="text-amber-600 font-semibold">{i.so_luong_kho_du_phong || 0}</span> / Tổng: <span className="text-emerald-700 font-semibold">{i.so_luong_tong || 0}</span>
      </div>
    )},
    {
      header: "Spaulding / Nhiệt / Tk",
      accessorKey: "phan_loai_spaulding",
      sortable: true,
      cell: (i) => (
        <div className="bv103-type-label space-y-0.5">
          <div className="text-indigo-700">{i.phan_loai_spaulding_label || i.phan_loai_spaulding || "—"}</div>
          <div className={i.kha_nang_chiu_nhiet === "Cao" ? "text-emerald-600" : "text-amber-600"}>
            Nhiệt: {i.kha_nang_chiu_nhiet || "—"}
          </div>
          <div className="text-blue-600 font-semibold">
            {i.phuong_phap_tiet_khuan_label || i.phuong_phap_tiet_khuan || "—"}
          </div>
        </div>
      ),
    },
    { header: "Trạng thái", accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: "Quản lý", accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) }
  ];
  const columns = compact
    ? allColumns.filter((c) =>
        ["ma_danh_muc", "ten_danh_muc", "phan_loai_spaulding", "id"].includes(String(c.accessorKey)),
      )
    : allColumns;

  const selectedRow = selectedLoaiId ? data.find((r) => r.id === selectedLoaiId) : undefined;
  /** Trong sheet (compact): chi tiết = step inline — không Dialog lồng Dialog. */
  const compactDetailStep = Boolean(compact && selectedLoaiId);

  const detailPanel = (
    <LoaiDungCuChiTietPanel
      selectedLoaiId={selectedLoaiId}
      selectedTenLoai={selectedRow?.ten_danh_muc}
      selectedMaLoai={selectedRow?.ma_danh_muc}
      boDungCuChua={[]}
    />
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-700">
      {compactDetailStep ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedLoaiId(null)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft size={14} aria-hidden /> Danh sách loại
          </button>
          {detailPanel}
        </div>
      ) : (
        <>
          {compact ? (
            canWriteMaster ? (
              <div className="mb-1 flex justify-end">
                <button type="button" onClick={() => { setEditing(null); setIsFormOpen(true); }} className={C.ctaPrimary}>
                  <Plus size={16} /> Thêm loại
                </button>
              </div>
            ) : null
          ) : (
          <KsnkListPageHeader
            icon={LayoutGrid}
            title="Loại dụng cụ"
            eyebrow="Danh mục master · Phân loại dụng cụ"
            actions={
              <>
                {canWriteMaster ? (
                  <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Excel</summary>
                    <div className="pt-2">
                      <ImportExportToolbar
                        fileInputRef={fileInputRef}
                        isImporting={isImporting}
                        onExport={() => void exportTemplate()}
                        onImportClick={triggerImport}
                        onFileChange={(file) => void handleFileUpload(file)}
                        showImport
                        exportClassName={C.ctaMuted}
                        importClassName={C.ctaAmber}
                      />
                    </div>
                  </details>
                ) : null}
                {canWriteMaster ? (
                  <button type="button" onClick={() => { setEditing(null); setIsFormOpen(true); }} className={C.ctaPrimary}><Plus size={16} /> Thêm loại</button>
                ) : null}
              </>
            }
          />
          )}
          <div className={compact ? "min-w-0" : "min-w-0 sm:min-h-[450px]"}>
            <AdvancedDataTable
              columns={columns}
              data={data}
              loading={loading}
              enableMultiSelect={canWriteMaster}
              bodyMaxHeight="max-h-[min(58dvh,560px)]"
              searchValue={table.searchTerm}
              onSearch={table.handleSearch}
              onSort={table.handleSort}
              serverPagination={{
                page: table.page,
                totalPages: table.totalPages,
                totalCount: table.totalCount,
                pageSize: table.pageSize,
                onPageChange: table.setPage,
              }}
              rowClassName={(r) =>
                r.id === selectedLoaiId ? "bg-emerald-50/90 ring-1 ring-inset ring-[var(--primary)]/20" : ""
              }
              onRowClick={(r) => setSelectedLoaiId((cur) => (cur === r.id ? null : r.id))}
              onDeleteSelected={async (items) => {
                if (!items.length) return;
                if (!window.confirm(`Xóa mềm ${items.length} loại dụng cụ?`)) return;
                const result = await softDeleteManyLoaiDungCuAction(items.map((x) => x.id));
                if (!result.success) {
                  toast.error(result.error || "Không thể xóa danh sách.");
                  return;
                }
                toast.success("Đã xóa mềm dữ liệu đã chọn.");
                table.refresh();
              }}
            />
          </div>

          {!compact ? (
            <Dialog
              open={Boolean(selectedLoaiId)}
              onOpenChange={(open) => {
                if (!open) setSelectedLoaiId(null);
              }}
            >
              <DialogContent
                className={`flex max-h-[min(90dvh,880px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl ${BV103_DIALOG_STACK.hubContent}`}
                overlayClassName={`${BV103_DIALOG_STACK.hubOverlay} bg-slate-900/50`}
              >
                <DialogTitle className="sr-only">
                  Chi tiết loại dụng cụ
                  {selectedRow?.ma_danh_muc || selectedRow?.ten_danh_muc
                    ? ` (${selectedRow?.ma_danh_muc || ""}${selectedRow?.ma_danh_muc && selectedRow?.ten_danh_muc ? " — " : ""}${selectedRow?.ten_danh_muc || ""})`
                    : ""}
                </DialogTitle>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pr-12 sm:px-6 sm:pr-14">
                  {detailPanel}
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </>
      )}
      {canWriteMaster ? (
      <LoaiDungCuFormModal
        key={modalKey}
        open={isFormOpen}
        initialData={editing}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => table.refresh()}
      />
      ) : null}
    </div>
  );
}
