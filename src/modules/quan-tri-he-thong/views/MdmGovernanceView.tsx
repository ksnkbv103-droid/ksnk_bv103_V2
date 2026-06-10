"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  CheckCircle, 
  Check, 
  Plus, 
  Zap, 
  ToggleLeft, 
  ToggleRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { 
  getMdmGovernanceSnapshot, 
  refreshMdmGovernanceSuggestions,
  toggleRegistryFieldAction,
  deleteRegistryRowAction,
  rejectMdmSuggestionAction
} from "../danh-muc/actions/mdm-governance.actions";
import type { MdmFieldRegistryRow, MdmSuggestionRow, MdmCoverageRow } from "@/lib/master-data/governance";
import MdmSuggestionApproveModal from "../components/MdmSuggestionApproveModal";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export default function MdmGovernanceView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registry, setRegistry] = useState<MdmFieldRegistryRow[]>([]);
  const [suggestions, setSuggestions] = useState<MdmSuggestionRow[]>([]);
  const [coverage, setCoverage] = useState<MdmCoverageRow[]>([]);
  const [subTab, setSubTab] = useState<"REGISTRY" | "SUGGESTIONS">("REGISTRY");
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MdmSuggestionRow | null>(null);

  const fetchSnapshot = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getMdmGovernanceSnapshot();
      if (res.success && res.data) {
        setRegistry(res.data.registry);
        setSuggestions(res.data.suggestions);
        setCoverage(res.data.coverage);
      } else {
        toast.error("Không tải được Snapshot: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối Snapshot: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSnapshot();
  }, []);

  const handleRefreshSuggestions = async () => {
    setRefreshing(true);
    try {
      toast.info("Hệ thống đang quét cấu hình DB thực tế để tìm lỗ hổng...");
      const res = await refreshMdmGovernanceSuggestions();
      if (res.success) {
        toast.success("Đã hoàn tất quét DB! Phát hiện " + (res.data || 0) + " gợi ý mới.");
        await fetchSnapshot(true);
      } else {
        toast.error("Lỗi quét: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleRegistry = async (row: MdmFieldRegistryRow) => {
    const nextState = !row.is_active;
    try {
      toast.info(`Đang ${nextState ? "kích hoạt" : "hủy bỏ"} trigger cứng bảo vệ cột ${row.column_name}...`);
      const res = await toggleRegistryFieldAction(row.id, nextState);
      if (res.success) {
        toast.success(`Đã cập nhật cấu hình bảo vệ cho ${row.column_name}!`);
        await fetchSnapshot(true);
      } else {
        toast.error("Không thể cập nhật trigger: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    }
  };

  const handleDeleteRegistry = async (row: MdmFieldRegistryRow) => {
    if (!window.confirm(`Xóa cấu hình registry và tháo gỡ HOÀN TOÀN trigger kiểm soát cột ${row.column_name}?`)) {
      return;
    }
    try {
      toast.info(`Đang tháo gỡ trigger và xóa cấu hình cột ${row.column_name}...`);
      const res = await deleteRegistryRowAction(row.id);
      if (res.success) {
        toast.success(`Đã tháo gỡ cấu hình bảo vệ thành công!`);
        await fetchSnapshot(true);
      } else {
        toast.error("Không thể gỡ bỏ: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    }
  };

  const handleRejectSuggestion = async (row: MdmSuggestionRow) => {
    if (!window.confirm(`Từ chối gợi ý bảo vệ này? Gợi ý sẽ ẩn đi.`)) {
      return;
    }
    try {
      const res = await rejectMdmSuggestionAction(row.id);
      if (res.success) {
        toast.success("Đã bỏ qua gợi ý thành công.");
        await fetchSnapshot(true);
      } else {
        toast.error("Lỗi: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    }
  };

  const handleOpenApprove = (row: MdmSuggestionRow) => {
    setSelectedSuggestion(row);
    setApproveModalOpen(true);
  };

  // Calculate Coverage statistics
  const stats = useMemo(() => {
    const totalReg = registry.length;
    const pendingSug = suggestions.length;
    const totalCandidates = totalReg + pendingSug;
    const score = totalCandidates > 0 ? Math.round((totalReg / totalCandidates) * 100) : 100;
    const activeTriggers = registry.filter((r) => r.is_active && r.field_role === "FK_TO_DM").length;

    return {
      coverageScore: score,
      activeTriggers,
      pendingSug,
      totalReg
    };
  }, [registry, suggestions]);

  // Registry columns
  const registryColumns: Column<MdmFieldRegistryRow>[] = [
    {
      header: "BẢNG NGIỆP VỤ",
      accessorKey: "table_name",
      sortable: true,
      cell: (r) => <span className="font-mono font-bold text-slate-700 text-[11px]">{r.table_name}</span>
    },
    {
      header: "CỘT KHÓA NGOẠI",
      accessorKey: "column_name",
      sortable: true,
      cell: (r) => <span className="font-mono font-bold text-emerald-600 text-[11px]">{r.column_name}</span>
    },
    {
      header: "VAI TRÒ TRƯỜNG",
      accessorKey: "field_role",
      cell: (r) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600">
          {r.field_role}
        </span>
      )
    },
    {
      header: "LOẠI DANH MỤC LIÊN KẾT",
      accessorKey: "source_loai_danh_muc",
      cell: (r) => (
        <span className="font-mono font-bold text-teal-600 text-[11px]">
          {r.source_loai_danh_muc || <span className="text-slate-300 italic">N/A</span>}
        </span>
      )
    },
    {
      header: "BẮT BUỘC?",
      accessorKey: "is_required",
      cell: (r) => (
        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold uppercase ${r.is_required ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-50 text-slate-400"}`}>
          {r.is_required ? "Required" : "Optional"}
        </span>
      )
    },
    {
      header: "TRIGGER BẢO VỆ",
      accessorKey: "is_active",
      cell: (r) => (
        <button
          type="button"
          onClick={() => handleToggleRegistry(r)}
          className="flex items-center gap-1.5 text-xs text-left"
          title={r.is_active ? "Trigger đang BẬT. Click để TẮT" : "Trigger đang TẮT. Click để BẬT"}
        >
          {r.is_active ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
              <ToggleRight className="w-6 h-6" /> ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <ToggleLeft className="w-6 h-6" /> INACTIVE
            </span>
          )}
        </button>
      )
    },
    {
      header: "THAO TÁC",
      accessorKey: "id",
      cell: (r) => (
        <button
          type="button"
          onClick={() => handleDeleteRegistry(r)}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Tháo gỡ Trigger và xóa cấu hình"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <span className={bv103DesignTokens.labelBlockMuted}>Đang tải Snapshot Giám trị…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bv103DesignTokens.pageOuter} text-sm`}>
      <KsnkPageHeader
        title="Giám trị MDM"
        subtitle="Registry bảo vệ cột, gợi ý phê duyệt và tỷ lệ phủ master data."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`${bv103LayoutChrome.panelShellPadded} flex items-center justify-between`}>
          <div className="flex-1 space-y-1.5 pr-4">
            <p className={bv103DesignTokens.labelBlockMuted}>Tỷ lệ phủ MDM</p>
            <p className="text-3xl font-semibold text-slate-800">{stats.coverageScore}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${stats.coverageScore}%` }}
              />
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className={`${bv103LayoutChrome.panelShellPadded} flex items-center justify-between`}>
          <div>
            <p className={bv103DesignTokens.labelBlockMuted}>Trigger bảo vệ hoạt động</p>
            <p className="mt-1 text-3xl font-semibold text-teal-600">
              {stats.activeTriggers} / {stats.totalReg}
            </p>
            <p className="mt-1 text-xs text-slate-500">An toàn dữ liệu động</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className={`${bv103LayoutChrome.panelShellPadded} flex items-center justify-between`}>
          <div className="space-y-1.5">
            <p className={bv103DesignTokens.labelBlockMuted}>Gợi ý cần phê duyệt</p>
            <p className="text-3xl font-semibold text-amber-500">{stats.pendingSug}</p>
            <button
              type="button"
              onClick={handleRefreshSuggestions}
              disabled={refreshing}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {refreshing ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <RefreshCw className="w-3 h-3 shrink-0" />
              )}
              Quét lại Cột DB
            </button>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className={`overflow-hidden ${bv103LayoutChrome.panelSurface} flex min-h-[500px] flex-col`}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubTab("REGISTRY")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${subTab === "REGISTRY" ? "bg-[var(--primary)] text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Registry bảo vệ ({registry.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab("SUGGESTIONS")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${subTab === "SUGGESTIONS" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Gợi ý chuẩn hóa ({suggestions.length})
            </button>
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic pr-2">
            BV103 Metadata Control Center
          </div>
        </div>

        {/* Tab contents */}
        <div className="flex-1 p-4">
          {subTab === "REGISTRY" ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/20 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Danh sách dưới đây liệt kê các trường khóa ngoại trỏ tới <strong>sys_lookup_value</strong> được giám sát toàn vẹn. Mỗi khi bạn bật kích hoạt (ACTIVE), trigger <code>fn_mdm_validate_lookup_integrity</code> ở Postgres sẽ tự động kiểm soát khớp loại danh mục bắt buộc và chặn đứng ghi đè dữ liệu rác.
                </p>
              </div>
              <AdvancedDataTable
                columns={registryColumns}
                data={registry}
                loading={false}
                hideSearch={false}
                tableClassName="w-full table-fixed min-w-[800px] border-collapse text-left"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-3.5 bg-amber-50/20 border border-amber-100 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Hệ thống tự động phát hiện các cột khóa ngoại <code>*_id</code> hoặc cột text enum thô mới được thêm vào database nhưng chưa được bảo vệ. Hãy bấm **"Thiết lập Bảo vệ"** để cấu hình và tự động đính kèm trigger cứng mức cơ sở dữ liệu.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mb-2 animate-bounce" />
                  <span className="font-black text-sm uppercase tracking-widest">Không có cảnh báo nào!</span>
                  <span className="text-xs text-slate-400 mt-1 font-medium">Toàn vẹn dữ liệu MDM đã phủ kín 100%.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((s) => (
                    <div 
                      key={s.id} 
                      className="p-5 border border-slate-200 hover:border-amber-400 bg-white rounded-[var(--radius-shell)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        {/* Title Table & Column */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-mono font-black text-slate-700 text-xs truncate max-w-[200px] block">{s.table_name}</span>
                            <span className="font-mono font-bold text-amber-600 text-[11px] block mt-0.5">↳ {s.column_name}</span>
                          </div>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${s.suggestion_type === "REGISTER_FK" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-cyan-50 text-cyan-600 border border-cyan-200"}`}>
                            {s.suggestion_type}
                          </span>
                        </div>

                        {/* Description reason */}
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {s.reason}
                        </p>

                        {/* Confidence score */}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          Độ tin cậy gợi ý: 
                          <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">
                            {s.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleRejectSuggestion(s)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 hover:text-slate-600 rounded-lg font-extrabold text-[11px] uppercase tracking-wider transition-colors text-slate-400"
                        >
                          Bỏ qua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenApprove(s)}
                          className="flex items-center gap-1 px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-extrabold text-[11px] uppercase tracking-wider transition-all shadow-sm active:translate-y-[1px]"
                        >
                          <Plus className="w-3 h-3 shrink-0" />
                          Thiết lập Bảo vệ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suggestion Approve Modal */}
      <MdmSuggestionApproveModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        suggestion={selectedSuggestion}
        onApproved={() => void fetchSnapshot(true)}
      />
    </div>
  );
}
