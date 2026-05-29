// src/modules/giam-sat-chung/views/GiamSatChungPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, BarChart2, FileText, History } from "lucide-react";
import { getBangKiemsForGiamSat, getTieuChisForGiamSatChung } from "@/lib/mdm-read-gateway";
import GiamSatChungForm from "../components/GiamSatChungForm";
import HistoryTable from "../components/HistoryTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useDataTable } from "@/hooks/useDataTable";
import ChecklistTemplateTable from "../components/ChecklistTemplateTable";
import { toast } from "sonner";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import {
  mapTieuChiJsonbToCriterion,
  type TieuChiJsonbRaw,
} from "../lib/gsc-form-template-sync";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import {
  KsnkSupervisionHero,
  KsnkSupervisionPanel,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { useGscAnalyticsData } from "../hooks/use-gsc-analytics-data";

const GscStrategicAnalyticsPanel = dynamic(() => import("../components/GscStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-50" />,
});

const MODULE_KEY = "GIAM_SAT_CHUNG";

type BangKiemListRow = {
  id: string;
  ma_bk?: string | null;
  ten_bang_kiem?: string | null;
  ten_bk?: string | null;
  loai_giam_sat?: string | null;
  doi_tuong_giam_sat?: string | null;
  cach_tinh_diem?: string | null;
};

interface GiamSatChungPageProps {
  /** Slice 5 (reform v4): pre-filter danh mục bảng kiểm theo `loai_giam_sat`. */
  initialLoaiGiamSat?: "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG";
}

function GscAnalyticsTab({ initialLoaiGiamSat }: { initialLoaiGiamSat?: GiamSatChungPageProps["initialLoaiGiamSat"] }) {
  const d = useGscAnalyticsData(initialLoaiGiamSat);
  if (!d.initDone) return <SupervisionPageSkeleton />;
  return (
    <GscStrategicAnalyticsPanel
      tuNgay={d.tuNgay}
      setTuNgay={d.setTuNgay}
      denNgay={d.denNgay}
      setDenNgay={d.setDenNgay}
      bangKiemOptions={d.bangKiemOptions}
      selectedBangKiemMas={d.selectedBangKiemMas}
      setSelectedBangKiemMas={d.setSelectedBangKiemMas}
      khoiOptions={d.khoiOptions}
      selectedKhoiIds={d.selectedKhoiIds}
      setSelectedKhoiIds={d.setSelectedKhoiIds}
      khoaOptions={d.khoaOptions}
      selectedKhoaIds={d.selectedKhoaIds}
      setSelectedKhoaIds={d.setSelectedKhoaIds}
      ngheOptions={d.ngheOptions}
      selectedNgheIds={d.selectedNgheIds}
      setSelectedNgheIds={d.setSelectedNgheIds}
      khuVucOptions={d.khuVucOptions}
      selectedKhuVucIds={d.selectedKhuVucIds}
      setSelectedKhuVucIds={d.setSelectedKhuVucIds}
      selectedHinhThucIds={d.selectedHinhThucIds}
      setSelectedHinhThucIds={d.setSelectedHinhThucIds}
      payload={d.payload}
      loading={d.loading}
      loadError={d.loadError}
      showComplianceV4={initialLoaiGiamSat === "TUAN_THU" || !initialLoaiGiamSat}
    />
  );
}

export default function GiamSatChungPage({ initialLoaiGiamSat }: GiamSatChungPageProps = {}) {
  const [activeTab, setActiveTab] = useState<"form" | "history" | "analytics">("form");
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
    const bkId = String(bk.id || "");
    const tcRes = await getTieuChisForGiamSatChung(bkId, true);
    setLoadingTemplateDetail(false);

    if (!tcRes.success) {
      toast.error("Không thể tải tiêu chí: " + tcRes.error);
      return;
    }

    setEditSourceSessionId(null);
    setEditPayload(null);
    const criteria = (tcRes.data || []) as TieuChiJsonbRaw[];
    setFormProgress(null);
    const ma = String(bk.ma_bk ?? "").trim();
    setSelectedTemplate({
      id: ma || String(bk.id || ""),
      dbId: String(bk.id || ""),
      title: String(bk.ten_bang_kiem ?? bk.ten_bk ?? "").trim() || "Bảng kiểm",
      category: "Giám sát chung",
      criteria: criteria.map(mapTieuChiJsonbToCriterion),
    });
  };

  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      const res = await getBangKiemsForGiamSat();
      if (res.success) {
        const all = (res.data || []) as BangKiemListRow[];
        // Slice 5 (reform v4): filter theo loai_giam_sat khi route /tuan-thu /nhat-ky /he-thong.
        // Backward compat: bảng kiểm chưa set loai_giam_sat → mặc định coi là TUAN_THU.
        const filtered = initialLoaiGiamSat
          ? all.filter((bk) => {
              const lg = String(bk.loai_giam_sat || "").trim().toUpperCase();
              if (initialLoaiGiamSat === "TUAN_THU") {
                return !lg || lg === "TUAN_THU";
              }
              return lg === initialLoaiGiamSat;
            })
          : all;
        setDbTemplates(filtered);
      } else {
        toast.error(res.error || "Không tải được danh mục bảng kiểm");
      }
      setLoadingTemplates(false);
    }
    void loadTemplates();
  }, [initialLoaiGiamSat]);

  const showTabs = allowed.view;

  const supervisionTabs = useMemo((): SupervisionTabDef[] => {
    const core: SupervisionTabDef[] = [{ id: "form", label: "Form giám sát", icon: FileText }];
    if (!showTabs) return core;
    return [
      ...core,
      { id: "analytics", label: "Thống kê", icon: BarChart2 },
      { id: "history", label: "Lịch sử phiên", icon: History },
    ];
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
              onSort={(key) => handleSort(key as keyof BangKiemListRow)}
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

        {activeTab === "analytics" && showTabs && (
          <GscAnalyticsTab initialLoaiGiamSat={initialLoaiGiamSat} />
        )}
      </KsnkSupervisionPanel>
    </div>
  );
}
