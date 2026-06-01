// Danh mục Bộ dụng cụ (dm_bo_dung_cu) — form đầy đủ và import/export.
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
import {
  getBoDungCuRowsAction,
  getKhoaPhongOptionsForBoAction,
  getLoaiDungCuOptionsAction,
  softDeleteBoDungCuAction,
  softDeleteManyBoDungCuAction,
  toggleBoDungCuStatusAction,
} from "../actions/bo-dung-cu.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

export function BoDungCuPageContent() {
  const router = useRouter();
  const [data, setData] = useState<BoDungCuTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoDungCuTableRow | null>(null);
  const [loaiOptions, setLoaiOptions] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [khoaOptions, setKhoaOptions] = useState<{ id: string; ten_khoa: string }[]>([]);
  const [loadingLoai, setLoadingLoai] = useState(true);
  const [loadingKhoa, setLoadingKhoa] = useState(true);
  const [selectedBoId, setSelectedBoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setLoadingLoai(true);
      setLoadingKhoa(true);
      const [loaiResult, khoaResult] = await Promise.all([
        getLoaiDungCuOptionsAction(),
        getKhoaPhongOptionsForBoAction(),
      ]);
      if (!loaiResult.success) toast.error("Không tải được loại dụng cụ: " + loaiResult.error);
      if (!khoaResult.success) toast.error("Không tải được khoa sử dụng: " + khoaResult.error);
      setLoaiOptions(loaiResult.success ? loaiResult.data ?? [] : []);
      setKhoaOptions(khoaResult.success ? khoaResult.data ?? [] : []);
      setLoadingLoai(false);
      setLoadingKhoa(false);
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
    tableName: "dm_bo_dung_cu",
    displayName: "Bộ dụng cụ",
    uniqueKey: "ma_bo",
    columnMapping: BO_DUNG_CU_COLUMN_MAP,
    onGetData: () => getMasterDataExport("dm_bo_dung_cu", "ma_bo"),
    onImport: (d) => smartImportData({ tableName: "dm_bo_dung_cu", uniqueKey: "ma_bo", codePrefix: "BDC" }, d),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getBoDungCuColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";
  const selectedRow = selectedBoId ? data.find((r) => r.id === selectedBoId) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <BoDungCuPageHeader
        fileInputRef={fileInputRef}
        onFileChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        isImporting={isImporting}
        onTriggerImport={triggerImport}
        onExportTemplate={() => exportTemplate()}
        onCreate={openCreate}
      />

      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
          searchPlaceholder="Tìm theo mã, tên bộ, loại, khoa, ghi chú…"
          rowClassName={(r) =>
            r.id === selectedBoId ? "bg-emerald-50/90 ring-1 ring-inset ring-[#026f17]/20" : ""
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

      <BoDungCuChiTietPanel
        selectedBoId={selectedBoId}
        selectedMaBo={selectedRow?.ma_bo}
        selectedTenBo={selectedRow?.ten_bo}
        phan_loai_bo={selectedRow?.phan_loai_bo}
        boOptions={data.map((x) => ({ id: x.id, ma_bo: x.ma_bo || null, ten_bo: x.ten_bo || null }))}
        loaiOptions={loaiOptions.map((x) => ({ id: x.id, ma_danh_muc: null, ten_danh_muc: x.ten_danh_muc || null }))}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />

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
    </div>
  );
}

export default function BoDungCuPage() {
  return (
    <DmMasterPageGuard moduleKey="BO_DC" label="Danh mục Bộ dụng cụ">
      <BoDungCuPageContent />
    </DmMasterPageGuard>
  );
}
