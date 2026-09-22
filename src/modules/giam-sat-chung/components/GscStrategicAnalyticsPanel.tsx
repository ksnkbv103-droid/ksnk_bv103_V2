"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPctOrDash, rankTopLoi, tyLeBkFromCounts } from "@/lib/domain/bao-cao-pct";
import { PCT_SURFACE_LABEL, SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { GscChecklistNavigator } from "./GscChecklistNavigator";
import { GscBkAnalyticsDashboard } from "./GscBkAnalyticsDashboard";
import GscTgsCoverageRankingPanel from "./GscTgsCoverageRankingPanel";
import { useGscChecklistDetail } from "../hooks/use-gsc-checklist-detail";
import { SupervisionSourceLensToggle } from "@/lib/analytics/SupervisionSourceLensToggle";
import { SupervisionDoiSoatPanel } from "@/lib/analytics/SupervisionDoiSoatPanel";
import {
  gapRowsWithLensData,
  maskGapRowsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";

type Props = {
  tuNgay: string;
  denNgay: string;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  payload: GscStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  bkLabelRecord?: Record<string, string>;
  khoaFilterLocked?: boolean;
};

/**
 * Nội dung thống kê GSC — bộ lọc nằm ở `Bv103AnalyticsPageFrame.filterBar` (sticky, luôn hiện).
 */
export default function GscStrategicAnalyticsPanel(p: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [selectedMaBk, setSelectedMaBk] = useState<string | null>(() => searchParams.get("bk"));
  const [sourceLens, setSourceLens] = useState<SupervisionSourceLens>("ksnk");

  useEffect(() => {
    const fromUrl = searchParams.get("bk");
    if (fromUrl) setSelectedMaBk(fromUrl);
  }, [searchParams]);

  const syncBkToUrl = useCallback(
    (ma: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (ma) next.set("bk", ma);
      else next.delete("bk");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onSelectMaBk = useCallback(
    (ma: string | null) => {
      setSelectedMaBk(ma);
      syncBkToUrl(ma);
    },
    [syncBkToUrl],
  );

  const selectedLabel = useMemo(() => {
    if (!selectedMaBk) return "";
    return p.bkLabelRecord?.[selectedMaBk] ?? selectedMaBk;
  }, [selectedMaBk, p.bkLabelRecord]);

  const { detail, loading: detailLoading, error: detailError } = useGscChecklistDetail({
    maBk: selectedMaBk,
    tuNgay: p.tuNgay,
    denNgay: p.denNgay,
    selectedKhoiIds: p.selectedKhoiIds,
    selectedKhoaIds: p.selectedKhoaIds,
    selectedNgheIds: p.selectedNgheIds,
    selectedKhuVucIds: p.selectedKhuVucIds,
    selectedHinhThucIds: p.selectedHinhThucIds,
    khoiOptionCount: p.khoiOptions.length,
    khoaOptionCount: p.khoaOptions.length,
    ngheOptionCount: p.ngheOptions.length,
    khuOptionCount: p.khuVucOptions.length,
  });

  const gapKhoaRows = useMemo(
    () => buildGapKhoaRows(p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions, p.khoaOptions.length),
    [p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions],
  );


  const chartRows = useMemo(
    () => maskGapRowsForLens(gapRowsWithLensData(gapKhoaRows, sourceLens), sourceLens),
    [gapKhoaRows, sourceLens],
  );

  const poolBk = tyLeBkFromCounts(
    p.payload?.kpis?.tong_dat ?? 0,
    p.payload?.kpis?.tong_quan_sat ?? 0,
    p.payload?.kpis?.tong_vi_pham,
  );

  const topKy = useMemo(
    () =>
      rankTopLoi(
        (p.payload?.top_violations ?? []).map((v) => ({
          id: v.criterion_id,
          ten: v.ten_tieu_chi,
          ma_bk: v.ma_bk,
          n_loi: v.so_vi_pham,
          n_ap_dung: v.tong_quan_sat,
          ket_qua: "KHONG_DAT" as const,
        })),
      ).slice(0, 8),
    [p.payload?.top_violations],
  );

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(p.payload?.matrix_khoi) },
      { title: "Theo chức năng phòng", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
    ],
    [p.payload],
  );

  return (
    <div className="space-y-[var(--bv103-space-3)] pb-8">
      {p.loadError ? (
        <div className={`${UI.inset} border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{p.loadError}</div>
      ) : null}

      <div id="so-sanh" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-2">
        <SupervisionSourceLensToggle value={sourceLens} onChange={setSourceLens} disabled={p.loading} />
        <p className="text-[11px] text-slate-500">
          Kỳ {p.tuNgay} → {p.denNgay} · nguồn {sourceLens === "ksnk" ? "chuyên trách" : "tự giám sát"}
        </p>
      </div>

      <GscChecklistNavigator
        payload={p.payload}
        loading={p.loading}
        selectedMaBk={selectedMaBk}
        onSelectMaBk={onSelectMaBk}
        bkLabelRecord={p.bkLabelRecord}
        limit={5}
      />

      {p.payload && !p.loading ? (
        <div className={`${UI.inset} px-4 py-3`}>
          <p className="text-[11px] font-semibold text-slate-600">
            Top lỗi toàn kỳ (n_loi ↓, ty_le_loi ↓, áp dụng ≥ 5)
          </p>
          {topKy.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Không có tiêu chí đủ mẫu.</p>
          ) : (
            <ol className="mt-1 list-decimal pl-4 text-xs text-slate-700">
              {topKy.map((t) => (
                <li key={`${t.ma_bk ?? ""}-${t.id}`}>
                  {t.ten}
                  {t.ma_bk ? ` · ${t.ma_bk}` : ""} — {t.n_loi} lỗi, {t.ty_le_loi.toFixed(1)}%
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {selectedMaBk ? (
        <GscBkAnalyticsDashboard
          key={selectedMaBk}
          maBk={selectedMaBk}
          label={selectedLabel}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          khoaOptions={p.khoaOptions}
          selectedKhoaIds={p.selectedKhoaIds}
          onClose={() => onSelectMaBk(null)}
        />
      ) : null}

      {selectedMaBk ? (
        <p className="text-[11px] text-slate-500">
          Đang xem {selectedMaBk}. Khoa, đối tượng và khu vực phía trên thuộc bảng kiểm này — không trộn{" "}
          {PCT_SURFACE_LABEL.gscPool}.
        </p>
      ) : (
        <>
          <section className={`${UI.shell} w-full min-w-0 p-4`}>
            <header className="mb-4">
              <h2 className="bv103-type-section text-slate-800">Thống kê theo khoa · {PCT_SURFACE_LABEL.gscPool}</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Mọi bảng kiểm trong lọc. Chọn một BM để xem khoa của riêng bảng kiểm đó.
                {p.khoaFilterLocked ? " Phạm vi khoa đang khóa." : ""}
              </p>
            </header>
            <SupervisionKhoaAnalyticsBlock
              rows={chartRows}
              matrixKhoaRows={p.payload?.matrix_khoa}
              loading={p.loading}
              moduleLabel="GSC"
              tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
              ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
              sourceLens={sourceLens}
            />
          </section>

          <details className={`${UI.shell}`} open>
            <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
              So sánh và xu hướng · {PCT_SURFACE_LABEL.gscPool}
              <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                Xu hướng · khối · khu vực · đối tượng của mọi BK — bấm để thu gọn
              </span>
            </summary>
            <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
              <SupervisionTrendChart
                title="Xu hướng tuân thủ (gộp)"
                data={p.payload?.trendline ?? []}
                loading={p.loading}
                source="gsc"
              />
              <SupervisionCompareAccordion
                sections={compareSections}
                loading={p.loading}
                defaultOpen={false}
                summaryLabel="So sánh theo khối · khu vực · đối tượng · hình thức"
              />
            </div>
          </details>
        </>
      )}

      <details className={`${UI.shell} group`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Nâng cao
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Đối soát · bao phủ TGS · KPI thô
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
          {selectedMaBk ? (
            <p className="text-[11px] text-slate-500">
              Đối soát và ty_le_bk dưới đây là {PCT_SURFACE_LABEL.gscPool}, không phải {selectedMaBk}.
            </p>
          ) : null}
          <SupervisionDoiSoatPanel rows={gapKhoaRows} source="gsc" loading={p.loading} />
          <GscTgsCoverageRankingPanel
            tuNgay={p.tuNgay}
            denNgay={p.denNgay}
            selectedKhoaIds={p.selectedKhoaIds}
          />
          <SupervisionKpiRow
            loading={p.loading}
            items={[
              { label: "Phiên giám sát", value: p.payload?.kpis?.tong_phien ?? 0 },
              { label: "Tiêu chí áp dụng", value: p.payload?.kpis?.tong_quan_sat ?? 0 },
              { label: "Vi phạm", value: p.payload?.kpis?.tong_vi_pham ?? 0 },
              { label: `${PCT_SURFACE_LABEL.gscPool} · ty_le_bk`, value: formatPctOrDash(poolBk.ty_le_bk, poolBk.n_ap_dung) },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
