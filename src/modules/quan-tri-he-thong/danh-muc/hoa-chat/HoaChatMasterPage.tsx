// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatMasterPage.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Beaker, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import HoaChatStatsPanel from "./HoaChatStatsPanel";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { toast } from "sonner";
import HoaChatFormModal from "./hoa-chat-form-modal";
import HoaChatNhomManager from "./HoaChatNhomManager";
import { useModulePermission } from "@/hooks/useModulePermission";
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
import { confirmAction } from "@/components/shared/confirm-action";

function HoaChatMasterPageContent() {
  const [data, setData] = useState<HoaChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HoaChatRow | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [nhomOpen, setNhomOpen] = useState(false);
  const [nhomFilter, setNhomFilter] = useState("");
  const { isAdmin } = useModulePermission("HOA_CHAT");

  const nhomTenList = useMemo(
    () => Array.from(new Set(data.map((r) => r.nhom_ten).filter((t): t is string => Boolean(t)))).sort((a, b) => a.localeCompare(b, "vi")),
    [data],
  );
  const shown = useMemo(() => (nhomFilter ? data.filter((r) => r.nhom_ten === nhomFilter) : data), [data, nhomFilter]);

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
      if (!(await confirmAction(`Ngừng sử dụng hóa chất ${row.ma_hoa_chat || row.id}?`))) return;
      const result = await softDeleteHoaChatAction(row.id);
      if (!result.success) {
        toast.error(result.error || "Không thể ngừng sử dụng.");
        return;
      }
      toast.success("Đã ngừng sử dụng.");
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
    <div className="space-y-3 animate-in fade-in duration-700">
      <KsnkListPageHeader
        icon={Beaker}
        title="Danh mục hóa chất và vật tư"
        eyebrow="Danh mục hóa chất, vật tư và test kit khoa KSNK"
        actions={
          <>
            <button type="button" onClick={() => setShowStats((v) => !v)} className={T.btnSecondary}>
              <BarChart2 size={15} />
              Thống kê
              {showStats ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">Excel</summary>
              <div className="pt-2">
                <ImportExportToolbar
                  fileInputRef={fileInputRef}
                  isImporting={isImporting}
                  onExport={() => void exportTemplate()}
                  onImportClick={triggerImport}
                  onFileChange={(file) => void handleFileUpload(file)}
                  exportClassName={T.btnSecondary}
                  importClassName={T.btnSecondary}
                />
              </div>
            </details>
            {isAdmin ? (
              <button type="button" onClick={() => setNhomOpen(true)} className={T.btnSecondary}>
                Quản lý nhóm
              </button>
            ) : null}
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={C.ctaPrimary}>
              <Plus size={16} /> Thêm mới
            </button>
          </>
        }
      />

      {/* Thống kê tóm tắt */}
      {showStats && !loading && <HoaChatStatsPanel data={data} />}

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500" htmlFor="hc-nhom-filter">Nhóm</label>
        <select id="hc-nhom-filter" value={nhomFilter} onChange={(e) => setNhomFilter(e.target.value)} className={`${C.controlInput} max-w-xs`}>
          <option value="">Tất cả nhóm</option>
          {nhomTenList.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="min-w-0 sm:min-h-[450px]">
        <AdvancedDataTable
          columns={columns}
          data={shown}
          loading={loading}
          enableMultiSelect={true}
          bodyMaxHeight="max-h-[min(58dvh,560px)]"
          onDeleteSelected={async (rows) => {
            if (!rows.length) return;
            if (!(await confirmAction(`Ngừng sử dụng ${rows.length} hóa chất?`))) return;
            const result = await softDeleteManyHoaChatAction(rows.map((r) => r.id));
            if (!result.success) {
              toast.error(result.error || "Không thể xóa danh sách.");
              return;
            }
            toast.success("Đã ngừng sử dụng các mục đã chọn.");
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
      {isAdmin ? (
        <HoaChatNhomManager open={nhomOpen} onClose={() => setNhomOpen(false)} onChanged={() => setRefreshKey((k) => k + 1)} />
      ) : null}
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
