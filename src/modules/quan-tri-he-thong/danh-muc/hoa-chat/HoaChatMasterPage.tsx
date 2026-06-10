// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatMasterPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Plus, Beaker, Upload, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import HoaChatStatsPanel from "./HoaChatStatsPanel";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { toast } from "sonner";
import HoaChatFormModal from "./hoa-chat-form-modal";
import MasterDataImportExportModal from "../../components/MasterDataImportExportModal";
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

function HoaChatMasterPageContent() {
  const [data, setData] = useState<HoaChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // Removed legacy useImportExport hook to improve bundle size and maintain cleanliness
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
            <button type="button" onClick={() => setImportModalOpen(true)} className={C.ctaEmerald}>
              <Upload size={15} /> Nhập/Xuất Excel
            </button>
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={C.ctaPrimary}>
              <Plus size={16} /> Thêm mới
            </button>
          </>
        }
      />

      {/* Thống kê tóm tắt */}
      {showStats && !loading && <HoaChatStatsPanel data={data} />}

      <div className="bg-white p-2 rounded-[var(--radius-shell)] border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
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
      <MasterDataImportExportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        type="hoa-chat"
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
