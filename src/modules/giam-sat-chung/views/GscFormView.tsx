// src/modules/giam-sat-chung/views/GscFormView.tsx
"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBangKiemsForGiamSat, getTieuChisForGiamSatChung } from "@/lib/mdm-read-gateway";
import GiamSatChungForm from "../components/GiamSatChungForm";
import ChecklistTemplateTable from "../components/ChecklistTemplateTable";
import { useDataTable } from "@/hooks/useDataTable";
import { toast } from "sonner";
import type { BangKiemCachTinhDiem, ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import {
  mapTieuChiJsonbToCriterion,
  type TieuChiJsonbRaw,
} from "../lib/gsc-form-template-sync";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import type { GscFormProgress } from "../lib/gsc-score-display";

type BangKiemListRow = {
  id: string;
  ma_bk?: string | null;
  ten_bang_kiem?: string | null;
  ten_bk?: string | null;
  loai_giam_sat?: string | null;
  doi_tuong_giam_sat?: string | null;
  cach_tinh_diem?: string | null;
};

function filterBangKiemByLoai(
  all: BangKiemListRow[],
  initialLoaiGiamSat?: GscLoaiGiamSatRoute,
): BangKiemListRow[] {
  if (!initialLoaiGiamSat) return all;
  return all.filter((bk) => {
    const lg = String(bk.loai_giam_sat || "").trim().toUpperCase();
    if (initialLoaiGiamSat === "TUAN_THU") return !lg || lg === "TUAN_THU";
    return lg === initialLoaiGiamSat;
  });
}

/** Resolve base path cho navigation dựa trên loaiGiamSat. */
function resolveBasePath(loai?: GscLoaiGiamSatRoute): string {
  if (!loai) return "/giam-sat-chung";
  switch (loai) {
    case "TUAN_THU": return "/giam-sat-chung/tuan-thu";
    case "NHAT_KY_VAN_HANH": return "/giam-sat-chung/nhat-ky";
    case "DANH_GIA_HE_THONG": return "/giam-sat-chung/he-thong";
    default: return "/giam-sat-chung";
  }
}

interface GscFormViewProps {
  initialLoaiGiamSat?: GscLoaiGiamSatRoute;
}

export default function GscFormView({ initialLoaiGiamSat }: GscFormViewProps) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [editSourceSessionId, setEditSourceSessionId] = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<{
    session: Partial<GiamSatSession>;
    results: ChecklistResult[];
  } | null>(null);
  const [formProgress, setFormProgress] = useState<GscFormProgress | null>(null);
  const [dbTemplates, setDbTemplates] = useState<BangKiemListRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false);

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
    const lg = String(bk.loai_giam_sat ?? "").trim().toUpperCase() || null;
    const cach = String(bk.cach_tinh_diem ?? "").trim().toUpperCase() || null;
    setSelectedTemplate({
      id: ma || String(bk.id || ""),
      dbId: String(bk.id || ""),
      title: String(bk.ten_bang_kiem ?? bk.ten_bk ?? "").trim() || "Bảng kiểm",
      category: "Giám sát chung",
      criteria: criteria.map(mapTieuChiJsonbToCriterion),
      loai_giam_sat: lg as GscLoaiGiamSatRoute | null,
      cach_tinh_diem: cach as BangKiemCachTinhDiem | null,
    });
  };

  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      const res = await getBangKiemsForGiamSat();
      if (res.success) {
        const all = (res.data || []) as BangKiemListRow[];
        setDbTemplates(filterBangKiemByLoai(all, initialLoaiGiamSat));
      } else {
        toast.error(res.error || "Không tải được danh mục bảng kiểm");
      }
      setLoadingTemplates(false);
    }
    void loadTemplates();
  }, [initialLoaiGiamSat]);

  const basePath = resolveBasePath(initialLoaiGiamSat);

  return (
    <KsnkSupervisionPanel className={`min-h-[50vh] ${UI.sectionGapLg}`}>
      {selectedTemplate ? (
        <div className={UI.sectionGapLg}>
          {loadingTemplateDetail ? (
            <div className={`${UI.shell} px-4 py-3 text-xs font-semibold text-slate-500`}>
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
              <h2 className={`truncate ${UI.modalTitle}`}>
                {selectedTemplate.title}
              </h2>
              {formProgress ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1">
                    Đã đánh giá: {formProgress.evaluated}/{formProgress.total} tiêu chí
                  </span>
                  <span className={`rounded-md bg-slate-50 px-2.5 py-1 ${formProgress.scoreClassName}`}>
                    {formProgress.scoreLabel}
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
              router.push(`${basePath}/lich-su`);
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
      )}
    </KsnkSupervisionPanel>
  );
}
