// src/modules/giam-sat-chung/views/GiamSatChungPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, History } from "lucide-react";
import { getBangKiemsForGiamSat, getTieuChisForGiamSatChung } from "@/modules/quan-tri-he-thong/bang-kiem/actions/bang-kiem.actions";
import GiamSatChungForm from "../components/GiamSatChungForm";
import HistoryTable from "../components/HistoryTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useDataTable } from "@/hooks/useDataTable";
import ChecklistTemplateTable from "../components/ChecklistTemplateTable";
import { toast } from "sonner";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { GscHistoryRow } from "../lib/gsc-read-utils";
import {
  KsnkSupervisionHero,
  KsnkSupervisionPanel,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const MODULE_KEY = "GIAM_SAT_CHUNG";

type BangKiemListRow = { id: string; ma_bk?: string | null; ten_bang_kiem?: string | null; ten_bk?: string | null };

export default function GiamSatChungPage() {
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [editSourceSessionId, setEditSourceSessionId] = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<{
    session: Partial<GiamSatSession>;
    results: ChecklistResult[];
  } | null>(null);
  const [formProgress, setFormProgress] = useState<{ evaluated: number; total: number; rate: number } | null>(null);
  const [dbTemplates, setDbTemplates] = useState<BangKiemListRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false);
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);

  const { processedData, handleSort, handleSearch, searchTerm } = useDataTable<BangKiemListRow>(dbTemplates, [
    "ten_bk",
    "ten_bang_kiem",
    "ma_bk",
  ]);

  const handleSelectTemplate = async (bk: BangKiemListRow) => {
    setLoadingTemplateDetail(true);
    const tcRes = await getTieuChisForGiamSatChung(String(bk.id || ""), true);
    setLoadingTemplateDetail(false);

    if (!tcRes.success) {
      toast.error("Không thể tải tiêu chí: " + tcRes.error);
      return;
    }

    setEditSourceSessionId(null);
    setEditPayload(null);
    const criteria = tcRes.data || [];
    setFormProgress(null);
    const ma = String(bk.ma_bk ?? "").trim();
    setSelectedTemplate({
      id: ma || String(bk.id || ""),
      dbId: String(bk.id || ""),
      title: String(bk.ten_bang_kiem ?? bk.ten_bk ?? "").trim() || "Bảng kiểm",
      category: "Giám sát chung",
      criteria: criteria.map((c: { id: string; noi_dung?: string | null; stt: number; diem_toi_da?: number }) => ({
        id: c.id,
        label: String(c.noi_dung ?? "").trim() || "Tiêu chí",
        maxScore: c.diem_toi_da || 1,
      })),
    });
  };

  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      const res = await getBangKiemsForGiamSat();
      if (res.success) {
        setDbTemplates((res.data || []) as BangKiemListRow[]);
      } else {
        toast.error(res.error || "Không tải được danh mục bảng kiểm");
      }
      setLoadingTemplates(false);
    }
    void loadTemplates();
  }, []);

  const showTabs = allowed.view;

  const supervisionTabs = useMemo((): SupervisionTabDef[] => {
    const core: SupervisionTabDef[] = [{ id: "form", label: "Form giám sát", icon: FileText }];
    if (!showTabs) return core;
    return [...core, { id: "history", label: "Lịch sử phiên", icon: History }];
  }, [showTabs]);

  if (permLoading) {
    return <SupervisionPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      <KsnkSupervisionHero
        eyebrow="Bảng kiểm theo bộ quy chuẩn thực hành kiểm soát nhiễm khuẩn"
        title={
          <>
            Giám sát <span className="text-[var(--primary)]">tổng hợp</span>
          </>
        }
        trailing={
          <KsnkSupervisionTabList
            tabs={supervisionTabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as typeof activeTab)}
            ariaLabel="Giám sát chung"
          />
        }
      />

      <KsnkSupervisionPanel className="min-h-[50vh]">
        {activeTab === "form" &&
          (selectedTemplate ? (
            <div className="space-y-6">
              {loadingTemplateDetail ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
                  Đang tải chi tiết bảng kiểm...
                </div>
              ) : null}
              <div className="no-print flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFormProgress(null);
                    setEditSourceSessionId(null);
                    setEditPayload(null);
                  }}
                  className="app-shell-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[var(--primary)]"
                  aria-label="Quay lại danh mục bảng kiểm"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
                    {selectedTemplate.title}
                  </h2>
                  {formProgress ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1">
                        Đã đánh giá: {formProgress.evaluated}/{formProgress.total} tiêu chí
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        Tỉ lệ tuân thủ: {formProgress.rate}%
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <GiamSatChungForm
                template={selectedTemplate}
                editPayload={editPayload || undefined}
                editingSessionId={editSourceSessionId}
                onProgressChange={setFormProgress}
                onSuccess={() => {
                  setSelectedTemplate(null);
                  setEditSourceSessionId(null);
                  setEditPayload(null);
                  setFormProgress(null);
                  setActiveTab("history");
                }}
                onCancel={() => {
                  setSelectedTemplate(null);
                  setFormProgress(null);
                  setEditSourceSessionId(null);
                  setEditPayload(null);
                }}
              />
            </div>
          ) : (
            <ChecklistTemplateTable
              data={processedData}
              onSelect={handleSelectTemplate}
              onSearch={handleSearch}
              onSort={handleSort}
              searchTerm={searchTerm}
              loading={loadingTemplates}
            />
          ))}

        {activeTab === "history" && showTabs && (
          <div className="app-data-shell overflow-hidden p-2">
            <HistoryTable
              onEditBundle={(bundle, row) => {
                setEditSourceSessionId(String(row.id || "").trim() || null);
                setEditPayload({
                  session: bundle.session as Partial<GiamSatSession>,
                  results: bundle.results || [],
                });
                setSelectedTemplate(bundle.template);
                setFormProgress(null);
                setActiveTab("form");
              }}
            />
          </div>
        )}
      </KsnkSupervisionPanel>
    </div>
  );
}
