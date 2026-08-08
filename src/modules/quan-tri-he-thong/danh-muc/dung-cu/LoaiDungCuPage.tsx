"use client";
import React, { useEffect, useState } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { ImportExportHint, ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LoaiDungCuFormModal from "./loai-dung-cu-form-modal";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { LoaiDungCuChiTietPanel } from "./loai-dung-cu-chi-tiet-panel";
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

export function LoaiDungCuPageContent() {
  const router = useRouter();
  const [data, setData] = useState<LoaiDungCuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLoaiId, setSelectedLoaiId] = useState<string | null>(null);
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

  useEffect(() => {
    if (selectedLoaiId && !data.some((r) => r.id === selectedLoaiId)) setSelectedLoaiId(null);
  }, [data, selectedLoaiId]);

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
    onSuccess: () => { setRefreshKey(k => k + 1); router.refresh(); }
  });

  const columns: Column<LoaiDungCuRow>[] = [
    { header: "Mã loại", accessorKey: "ma_danh_muc", sortable: true, cell: (i) => (
      <span className="font-mono text-[11px] text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
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
        <span className="bg-[var(--surface-warning-bg)] text-[var(--surface-warning-text)] border border-[var(--surface-warning-border)] text-[11px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wide">Thủ thuật</span>
      ) : (
        <span className="bg-[var(--surface-success-bg)] text-[var(--surface-success-text)] border border-[var(--surface-success-border)] text-[11px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wide">Phẫu thuật</span>
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
      <div className="text-[11px] font-bold text-slate-600">
        Dự phòng: <span className="text-amber-600 font-black">{i.so_luong_kho_du_phong || 0}</span> / Tổng: <span className="text-emerald-700 font-black">{i.so_luong_tong || 0}</span>
      </div>
    )},
    {
      header: "Spaulding / Nhiệt / TK",
      accessorKey: "phan_loai_spaulding",
      sortable: true,
      cell: (i) => (
        <div className="text-[11px] font-bold uppercase space-y-0.5">
          <div className="text-indigo-700">{i.phan_loai_spaulding_label || i.phan_loai_spaulding || "—"}</div>
          <div className={i.kha_nang_chiu_nhiet === "Cao" ? "text-emerald-600" : "text-amber-600"}>
            Nhiệt: {i.kha_nang_chiu_nhiet || "—"}
          </div>
          <div className="text-blue-600 font-black">
            {i.phuong_phap_tiet_khuan_label || i.phuong_phap_tiet_khuan || "—"}
          </div>
        </div>
      ),
    },
    { header: "Trạng thái", accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: "Quản lý", accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) }
  ];

  const selectedRow = selectedLoaiId ? data.find((r) => r.id === selectedLoaiId) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <KsnkListPageHeader
        icon={LayoutGrid}
        title="Loại dụng cụ"
        eyebrow="Danh mục master · Phân loại dụng cụ"
        actions={
          <>
            <ImportExportToolbar
              fileInputRef={fileInputRef}
              isImporting={isImporting}
              onExport={() => void exportTemplate()}
              onImportClick={triggerImport}
              onFileChange={(file) => void handleFileUpload(file)}
              exportClassName={C.ctaMuted}
              importClassName={C.ctaAmber}
            />
            <button type="button" onClick={() => { setEditing(null); setIsFormOpen(true); }} className={C.ctaPrimary}><Plus size={18} /> Thêm mới</button>
          </>
        }
      />
      <ImportExportHint />
      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm min-w-0 sm:min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
          rowClassName={(r) =>
            r.id === selectedLoaiId ? "bg-emerald-50/90 ring-1 ring-inset ring-[var(--primary)]/20" : ""
          }
          onRowClick={(r) =>
            setSelectedLoaiId((cur) => (cur === r.id ? null : r.id))
          }
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

      <LoaiDungCuChiTietPanel
        selectedLoaiId={selectedLoaiId}
        selectedTenLoai={selectedRow?.ten_danh_muc}
        selectedMaLoai={selectedRow?.ma_danh_muc}
        boDungCuChua={selectedRow?.bo_dung_cu_chua || []}
      />
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
