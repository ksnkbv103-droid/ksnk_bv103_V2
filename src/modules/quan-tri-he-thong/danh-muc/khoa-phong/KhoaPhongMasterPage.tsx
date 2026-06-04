// src/modules/quan-tri-he-thong/danh-muc/khoa-phong/KhoaPhongMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus, Building2, FileSpreadsheet } from "lucide-react";
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
  softDeleteKhoaPhongAction,
  softDeleteManyKhoaPhongAction,
  toggleKhoaPhongStatusAction,
} from "../actions/khoa-phong.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import MasterDataImportExportModal from "../../components/MasterDataImportExportModal";

function KhoaPhongMasterPageContent() {
  const [data, setData] = useState<KhoaPhongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaPhongRow | null>(null);
  const [khoiOptions, setKhoiOptions] = useState<{ id: string; ten_danh_muc: string }[]>([]);

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
            <button type="button" onClick={() => setImportModalOpen(true)} className={bv103DesignTokens.btnSecondary}>
              <FileSpreadsheet size={16} aria-hidden /> Nhập/Xuất Excel
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
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
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
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      <MasterDataImportExportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        type="khoa-phong"
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
