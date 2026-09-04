// src/modules/quan-tri-he-thong/danh-muc/khoa-phong/KhoaPhongMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useImportExport } from "@/hooks/useImportExport";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { toast } from "sonner";
import KhoaPhongFormModal from "./khoa-phong-form-modal";
import { getKhoaPhongColumns } from "./khoa-phong-columns";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";
import {
  getKhoiKhoaOptionsAction,
  getKhoaPhongRowsAction,
  getKhuVucGiamSatOptionsAction,
  softDeleteKhoaPhongAction,
  softDeleteManyKhoaPhongAction,
  toggleKhoaPhongStatusAction,
} from "../actions/khoa-phong.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import { smartImportMasterTable } from "../actions/smart-import.gateway";
import { getMasterDataExport } from "../actions/export.actions";

function KhoaPhongMasterPageContent() {
  const router = useRouter();
  const [data, setData] = useState<KhoaPhongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaPhongRow | null>(null);
  const [khoiOptions, setKhoiOptions] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [khuVucOptions, setKhuVucOptions] = useState<{ id: string; ma: string; ten: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getKhoaPhongRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được danh mục khoa phòng.");
      setData(result.success ? result.data : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    (async () => {
      const result = await getKhoiKhoaOptionsAction();
      if (!result.success) {
        toast.error(result.error || "Không tải được danh mục khối khoa.");
        return;
      }
      setKhoiOptions(result.data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const result = await getKhuVucGiamSatOptionsAction();
      if (!result.success) {
        toast.error(result.error || "Không tải được danh mục khu vực giám sát.");
        return;
      }
      setKhuVucOptions(result.data);
    })();
  }, []);

  const actionUi = useTableActionUi<KhoaPhongRow>({
    onToggleStatus: async (row) => {
      const result = await toggleKhoaPhongStatusAction(row.id, Boolean(row.is_active));
      if (!result.success) {
        toast.error(result.error || "Không cập nhật được trạng thái.");
        return;
      }
      toast.success("Đã cập nhật trạng thái.");
      setRefreshKey((k) => k + 1);
    },
    onEdit: (row) => {
      setEditing(row);
      setFormOpen(true);
    },
    onDelete: async (row) => {
      if (!window.confirm(`Tắt khoa phòng ${row.ma_danh_muc || row.id}? Khoa vẫn còn trong sổ, có thể bật lại.`)) return;
      const result = await softDeleteKhoaPhongAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể tắt khoa.");
        return;
      }
      toast.success("Đã tắt khoa (xóa mềm).");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "KHOA_PHONG",
    tableName: "mdm_dm_khoa_phong",
    displayName: "Khoa phòng",
    uniqueKey: "ma_khoa",
    columnMapping: {
      "Mã khoa": "ma_khoa",
      "Tên khoa": "ten_khoa",
      "Mã khối": "ma_khoi",
      "Tên khối": "ten_khoi",
      "Mô tả chức năng": "mo_ta_chuc_nang",
      "Số bác sĩ": "so_bac_si",
      "Số điều dưỡng": "so_dieu_duong",
      "Giường thường": "so_giuong_benh_thuong",
      "Giường cấp cứu": "so_giuong_cap_cuu",
      is_active: "is_active",
    },
    onGetData: () => getMasterDataExport("mdm_dm_khoa_phong", "ma_khoa"),
    onImport: (d, options) =>
      smartImportMasterTable("mdm_dm_khoa_phong", d, {
        softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun,
      }),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getKhoaPhongColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-3 animate-in fade-in duration-700">
      <KsnkPageHeader
        showTitle={false}
        title="Khoa phòng & Đơn vị"
        actions={
          <>
            <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Excel</summary>
              <div className="pt-2">
                <ImportExportToolbar
                  fileInputRef={fileInputRef}
                  isImporting={isImporting}
                  onExport={() => void exportTemplate()}
                  onImportClick={triggerImport}
                  onFileChange={(file) => void handleFileUpload(file)}
                  exportClassName={bv103DesignTokens.btnSecondary}
                  importClassName={bv103DesignTokens.btnSecondary}
                />
              </div>
            </details>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className={bv103DesignTokens.btnPrimary}
            >
              <Plus size={16} aria-hidden /> Thêm mới
            </button>
          </>
        }
      />
      <div className="min-w-0 sm:min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          tableClassName="w-full table-fixed min-w-[900px] border-collapse text-left"
          enableMultiSelect={true}
          bodyMaxHeight="max-h-[min(58dvh,560px)]"
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Tắt ${rows.length} khoa phòng? Khoa vẫn còn trong sổ, có thể bật lại.`)) return;
            const result = await softDeleteManyKhoaPhongAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể tắt danh sách khoa.");
              return;
            }
            toast.success("Đã tắt khoa đã chọn (xóa mềm).");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      <KhoaPhongFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        khoiOptions={khoiOptions}
        khuVucOptions={khuVucOptions}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function KhoaPhongMasterPage() {
  return (
    <DmMasterPageGuard moduleKey="KHOA_PHONG" label="Danh mục Khoa phòng">
      <KhoaPhongMasterPageContent />
    </DmMasterPageGuard>
  );
}
