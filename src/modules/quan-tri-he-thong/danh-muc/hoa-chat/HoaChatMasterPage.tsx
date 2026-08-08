// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus, Beaker, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import HoaChatStatsPanel from "./HoaChatStatsPanel";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { ImportExportHint, ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { toast } from "sonner";
import HoaChatFormModal from "./hoa-chat-form-modal";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { getHoaChatColumns } from "./hoa-chat-columns";
import type { HoaChatRow } from "../actions/hoa-chat.types";
import {
  getHoaChatRowsAction,
  softDeleteHoaChatAction,
  softDeleteManyHoaChatAction,
  toggleHoaChatStatusAction,
} from "../actions/hoa-chat.actions";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import { smartImportData } from "../actions/smart-import.actions";
import { getMasterDataExport } from "../actions/export.actions";

function HoaChatMasterPageContent() {
  const [data, setData] = useState<HoaChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HoaChatRow | null>(null);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getHoaChatRowsAction();
      if (!active) return;
      if (!result.success) toast.error(result.error || "Không tải được danh mục hóa chất.");
      setData(result.success ? result.data ?? [] : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const actionUi = useTableActionUi<HoaChatRow>({
    onToggleStatus: async (row) => {
      const result = await toggleHoaChatStatusAction(row.id, Boolean(row.is_active));
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
      if (!window.confirm(`Xóa mềm hóa chất ${row.ma_hoa_chat || row.id}?`)) return;
      const result = await softDeleteHoaChatAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể xóa mềm.");
        return;
      }
      toast.success("Đã xóa mềm dữ liệu.");
      setRefreshKey((k) => k + 1);
    },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "HOA_CHAT",
    tableName: "cssd_dm_hoa_chat",
    displayName: "Hóa chất",
    uniqueKey: "ma_hoa_chat",
    columnMapping: {
      "Mã hóa chất": "ma_hoa_chat",
      "Tên hóa chất": "ten_hoa_chat",
      "Loại hóa chất": "loai_hoa_chat",
      "Đơn vị tính": "don_vi_tinh",
      "Hạn sử dụng": "han_su_dung",
      "Ngưỡng tồn tối thiểu": "nguong_ton_toi_thieu",
      is_active: "is_active",
    },
    onGetData: () => getMasterDataExport("cssd_dm_hoa_chat", "ma_hoa_chat"),
    onImport: (d, options) =>
      smartImportData({ tableName: "cssd_dm_hoa_chat", uniqueKey: "ma_hoa_chat" }, d, {
        softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun,
      }),
    onSuccess: () => setRefreshKey((k) => k + 1),
  });

  const columns = getHoaChatColumns(actionUi);
  const modalKey = editing?.id ? `edit-${editing.id}` : "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <KsnkListPageHeader
        icon={Beaker}
        title="Hóa chất & Vật tư"
        eyebrow="Danh mục hóa chất, vật tư và test kit khoa KSNK"
        actions={
          <>
            <button type="button" onClick={() => setShowStats((v) => !v)} className={T.btnSecondary}>
              <BarChart2 size={15} />
              Thống kê
              {showStats ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <ImportExportToolbar
              fileInputRef={fileInputRef}
              isImporting={isImporting}
              onExport={() => void exportTemplate()}
              onImportClick={triggerImport}
              onFileChange={(file) => void handleFileUpload(file)}
              exportClassName={T.btnSecondary}
              importClassName={C.ctaEmerald}
            />
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={C.ctaPrimary}>
              <Plus size={16} /> Thêm mới
            </button>
          </>
        }
      />
      <ImportExportHint />

      {/* Thống kê tóm tắt */}
      {showStats && !loading && <HoaChatStatsPanel data={data} />}

      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm min-w-0 sm:min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={true}
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!window.confirm(`Xóa mềm ${rows.length} hóa chất?`)) return;
            const result = await softDeleteManyHoaChatAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã xóa mềm dữ liệu đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      <HoaChatFormModal
        key={modalKey}
        open={formOpen}
        initialRow={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function HoaChatMasterPage() {
  return (
    <DmMasterPageGuard moduleKey="HOA_CHAT" label="Danh mục Hóa chất">
      <HoaChatMasterPageContent />
    </DmMasterPageGuard>
  );
}
