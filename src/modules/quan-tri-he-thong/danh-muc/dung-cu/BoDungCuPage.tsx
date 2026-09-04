// Danh mục Bộ dụng cụ (cssd_dm_bo_dung_cu) — form đầy đủ và import/export.
"use client";

import React, { useEffect, useState } from "react";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import BoDungCuFormModal from "./bo-dung-cu-form-modal";
import { getBoDungCuColumns } from "./bo-dung-cu-columns";
import { BO_DUNG_CU_COLUMN_MAP } from "./bo-dung-cu-import";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";
import { BoDungCuPageHeader } from "./bo-dung-cu-page-header";
import { BoDungCuChiTietPanel } from "./bo-dung-cu-chi-tiet-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import { BoDungCuMaBoHealthBanner } from "./bo-dung-cu-ma-bo-health-banner";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  getBoDungCuRowsAction,
  getKhoaPhongOptionsForBoAction,
  softDeleteBoDungCuAction,
  softDeleteManyBoDungCuAction,
  toggleBoDungCuStatusAction,
} from "../actions/bo-dung-cu.actions";

export function BoDungCuPageContent({ onOpenLoaiSheet }: { onOpenLoaiSheet?: () => void }) {
  const router = useRouter();
  const { isAdmin } = useModulePermission("BO_DC");
  const canWriteMaster = isAdmin;
  const [data, setData] = useState<BoDungCuTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoDungCuTableRow | null>(null);
  const [loaiOptions] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [khoaOptions, setKhoaOptions] = useState<{ id: string; ten_khoa: string }[]>([]);
  const [loadingLoai, setLoadingLoai] = useState(true);
  const [loadingKhoa, setLoadingKhoa] = useState(true);
  const [selectedBoId, setSelectedBoId] = useState<string | null>(null);
  const [loaiFilter, setLoaiFilter] = useState("");

  useEffect(() => {
    async function loadOptions() {
      setLoadingKhoa(true);
      const khoaResult = await getKhoaPhongOptionsForBoAction();
      if (!khoaResult.success) toast.error("Không tải được khoa sử dụng: " + khoaResult.error);
      setKhoaOptions(khoaResult.success ? khoaResult.data ?? [] : []);
      setLoadingKhoa(false);
      setLoadingLoai(false);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getBoDungCuRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được danh sách bộ dụng cụ.");
      setData((result.success ? result.data : []) as BoDungCuTableRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (selectedBoId && !data.some((r) => r.id === selectedBoId)) setSelectedBoId(null);
  }, [data, selectedBoId]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: BoDungCuTableRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const actionUi = useTableActionUi<BoDungCuTableRow>({
    capabilities: { edit: canWriteMaster, delete: canWriteMaster, toggleActive: canWriteMaster },
    onToggleStatus: async (row) => {
      const result = await toggleBoDungCuStatusAction(row.id, Boolean(row.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: openEdit,
    onDelete: async (row) => {
      if (!window.confirm(`Xóa mềm bộ dụng cụ ${row.ma_bo || row.id}?`)) return;
      const result = await softDeleteBoDungCuAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa mềm.");
        return;
      }
      toast.success("Đã xóa mềm dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "BO_DC",
    tableName: "cssd_dm_bo_dung_cu",
    displayName: "Bộ dụng cụ",
    uniqueKey: "ma_bo",
    columnMapping: BO_DUNG_CU_COLUMN_MAP,
    onGetData: () => getMasterDataExport("cssd_dm_bo_dung_cu", "ma_bo"),
    onImport: (d, options) =>
      smartImportData({ tableName: "cssd_dm_bo_dung_cu", uniqueKey: "ma_bo", codePrefix: "BDC" }, d, {
        softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun,
      }),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getBoDungCuColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";
  const loaiFilterOptions = Array.from(
    new Set(data.map((r) => String(r.loai_dung_cu?.ten_danh_muc || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "vi"));
  const visibleData = loaiFilter
    ? data.filter((r) => String(r.loai_dung_cu?.ten_danh_muc || "").trim() === loaiFilter)
    : data;
  const selectedRow = selectedBoId ? visibleData.find((r) => r.id === selectedBoId) : undefined;

  return (
    <div className="bv103-stack-page animate-in fade-in duration-700">
      <BoDungCuMaBoHealthBanner />
      <BoDungCuPageHeader
        fileInputRef={fileInputRef}
        onFileSelected={(file) => void handleFileUpload(file)}
        isImporting={isImporting}
        onTriggerImport={triggerImport}
        onExportTemplate={() => void exportTemplate()}
        onCreate={openCreate}
        canWriteMaster={canWriteMaster}
        onOpenLoaiSheet={onOpenLoaiSheet}
        loaiFilter={loaiFilter}
        loaiFilterOptions={loaiFilterOptions}
        onLoaiFilterChange={setLoaiFilter}
      />

      <div className="min-w-0">
        <AdvancedDataTable
          columns={columns}
          data={visibleData}
          loading={loading}
          enableMultiSelect={canWriteMaster}
          bodyMaxHeight="max-h-[min(58dvh,560px)]"
          searchPlaceholder="Tìm theo mã, tên bộ, loại, khoa, ghi chú…"
          searchKeys={[
            "ma_bo",
            "ten_bo",
            "phan_loai_bo",
            "ghi_chu",
            "loai_dung_cu.ma_danh_muc",
            "loai_dung_cu.ten_danh_muc",
            "khoa_su_dung.ma_khoa",
            "khoa_su_dung.ten_khoa",
          ]}
          rowClassName={(r) =>
            r.id === selectedBoId ? "bg-emerald-50/90 ring-1 ring-inset ring-[var(--primary)]/20" : ""
          }
          onRowClick={(r) =>
            setSelectedBoId((cur) => (cur === r.id ? null : r.id))
          }
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Xóa mềm ${rows.length} bộ dụng cụ?`)) return;
            const result = await softDeleteManyBoDungCuAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa mềm dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>

      <Dialog
        open={Boolean(selectedBoId)}
        onOpenChange={(open) => {
          if (!open) setSelectedBoId(null);
        }}
      >
        <DialogContent
          className={`flex max-h-[min(90dvh,880px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl ${BV103_DIALOG_STACK.hubContent}`}
          overlayClassName={`${BV103_DIALOG_STACK.hubOverlay} bg-slate-900/50`}
        >
          <DialogTitle className="sr-only">
            Quản lý thành phần bộ
            {selectedRow?.ma_bo || selectedRow?.ten_bo
              ? ` (${selectedRow?.ma_bo || ""}${selectedRow?.ma_bo && selectedRow?.ten_bo ? " — " : ""}${selectedRow?.ten_bo || ""})`
              : ""}
          </DialogTitle>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pr-12 sm:px-6 sm:pr-14">
            <BoDungCuChiTietPanel
              selectedBoId={selectedBoId}
              selectedMaBo={selectedRow?.ma_bo}
              selectedTenBo={selectedRow?.ten_bo}
              phan_loai_bo={selectedRow?.phan_loai_bo}
              boOptions={data.map((x) => ({ id: x.id, ma_bo: x.ma_bo || null, ten_bo: x.ten_bo || null }))}
              loaiOptions={loaiOptions.map((x) => ({ id: x.id, ma_danh_muc: null, ten_danh_muc: x.ten_danh_muc || null }))}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {canWriteMaster ? (
      <BoDungCuFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        loaiOptions={loaiOptions}
        khoaOptions={khoaOptions}
        loadingLoai={loadingLoai}
        loadingKhoa={loadingKhoa}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      ) : null}
    </div>
  );
}
