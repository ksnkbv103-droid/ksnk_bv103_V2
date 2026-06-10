// src/modules/quan-tri-he-thong/danh-muc/khoa-phong/KhoaPhongMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus, Building2, Download, Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useImportExport } from "@/hooks/useImportExport";
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
import { smartImportData } from "../actions/smart-import.actions";
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
      if (!window.confirm(`Xóa cứng khoa phòng ${row.ma_danh_muc || row.id}?`)) return;
      const result = await softDeleteKhoaPhongAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa cứng.");
        return;
      }
      toast.success("Đã xóa cứng dữ liệu.");
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
    onImport: (d) => smartImportData({ tableName: "mdm_dm_khoa_phong", uniqueKey: "ma_khoa" }, d),
    onSuccess: () => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
  });

  const columns = getKhoaPhongColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <KsnkPageHeader
        title={
          <span className="inline-flex items-center gap-2 text-[var(--primary)]">
            <Building2 size={22} aria-hidden /> Khoa phòng &amp; Đơn vị
          </span>
        }
        subtitle="Quản lý khoa, phòng và liên kết khối tổ chức — dữ liệu dùng chung cho giám sát và nhân sự."
        actions={
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerImport}
              disabled={isImporting}
              className={bv103DesignTokens.btnSecondary}
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Upload size={16} aria-hidden />}
              Import Excel
            </button>
            <button type="button" onClick={() => exportTemplate()} className={bv103DesignTokens.btnSecondary}>
              <Download size={16} aria-hidden /> Export mẫu
            </button>
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
      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          tableClassName="w-full table-fixed min-w-[900px] border-collapse text-left"
          enableMultiSelect={true}
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Xóa cứng ${rows.length} khoa phòng?`)) return;
            const result = await softDeleteManyKhoaPhongAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa cứng dữ liệu đã chọn.");
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
