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
import { markSupervisionHistoryStale, SUPERVISION_HISTORY_PATHS } from "@/lib/supervision-form-nav";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import type { GscFormProgress } from "../lib/gsc-score-display";
import { loadGscViewBundle } from "../lib/load-gsc-view-bundle";
import type { GscLocPrefill } from "../lib/gsc-loc-prefill";
import type { GscPatientPrefill } from "../lib/gsc-patient-prefill";

export type { GscLocPrefill };

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

interface GscFormViewProps {
  initialLoaiGiamSat?: GscLoaiGiamSatRoute;
  /** Deep-link / quét QR: `?edit=<sessionUuid>` */
  editSessionId?: string | null;
  /** Deep-link tem vị trí: `?loc=khoa|khu&ma=` */
  locPrefill?: GscLocPrefill | null;
  /** Deep-link MDRO / BN: `?bk=BM.31.03&ma_benh_an=…` */
  patientPrefill?: GscPatientPrefill | null;
}

export default function GscFormView({
  initialLoaiGiamSat,
  editSessionId,
  locPrefill = null,
  patientPrefill = null,
}: GscFormViewProps) {
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
  const [editHydrating, setEditHydrating] = useState(Boolean(editSessionId));

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

  useEffect(() => {
    const sid = String(editSessionId || "").trim();
    if (!sid) {
      setEditHydrating(false);
      return;
    }
    if (dbTemplates.length === 0) return;

    let cancelled = false;
    setEditHydrating(true);
    void (async () => {
      const res = await loadGscViewBundle(dbTemplates as Record<string, unknown>[], { id: sid });
      if (cancelled) return;
      if (!res.ok) {
        toast.error(res.error || "Không mở được phiên từ mã QR");
        setEditHydrating(false);
        return;
      }
      setEditSourceSessionId(sid);
      setEditPayload({
        session: res.bundle.session as Partial<GiamSatSession>,
        results: res.bundle.results,
      });
      setSelectedTemplate(res.bundle.template);
      setEditHydrating(false);
      toast.success("Đã mở phiếu giám sát từ mã QR / liên kết");
    })();

    return () => {
      cancelled = true;
    };
  }, [editSessionId, dbTemplates]);

  /** Prefill BK + BN từ deep-link MDRO (không có edit session). */
  useEffect(() => {
    if (editSessionId || !patientPrefill || selectedTemplate || dbTemplates.length === 0) return;
    const maBk = String(patientPrefill.bangKiemMa || "").trim().toUpperCase();
    if (!maBk) return;
    const bk = dbTemplates.find((t) => String(t.ma_bk || "").trim().toUpperCase() === maBk);
    if (!bk) {
      toast.message(`Không tìm thấy bảng kiểm ${maBk} trong danh mục`);
      return;
    }
    void handleSelectTemplate(bk).then(() => {
      setEditPayload({
        session: {
          khoa_id: patientPrefill.khoaId || "",
          is_bo_sung_nguoi_benh: patientPrefill.boSungNb,
          ma_benh_an: patientPrefill.maBenhAn || "",
          ma_nguoi_benh: patientPrefill.maNguoiBenh || "",
          ten_nguoi_benh: patientPrefill.tenNguoiBenh || "",
        },
        results: [],
      });
      toast.success(`Đã mở ${maBk} với bệnh nhân được gắn`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep-link
  }, [patientPrefill, dbTemplates, editSessionId, selectedTemplate]);

  if (editHydrating) {
    return (
      <KsnkSupervisionPanel className={`min-h-[50vh] ${UI.sectionGapLg}`}>
        <div className={`${UI.shell} px-4 py-6 text-sm font-semibold text-slate-600`}>
          Đang mở phiếu giám sát…
        </div>
      </KsnkSupervisionPanel>
    );
  }

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
            locPrefill={editSourceSessionId ? null : locPrefill}
            onProgressChange={setFormProgress}
            onSuccess={() => {
              setSelectedTemplate(null);
              setEditSourceSessionId(null);
              setEditPayload(null);
              setFormProgress(null);
              markSupervisionHistoryStale("gsc");
              router.push(SUPERVISION_HISTORY_PATHS.gsc);
              router.refresh();
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
