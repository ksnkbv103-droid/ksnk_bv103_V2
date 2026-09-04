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
import { formatPercent2, formatPercent2FromRatio } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { GscChecklistNavigator } from "./GscChecklistNavigator";
import { GscBkAnalyticsDashboard } from "./GscBkAnalyticsDashboard";
import GscTgsCoverageRankingPanel from "./GscTgsCoverageRankingPanel";
import { useGscChecklistDetail } from "../hooks/use-gsc-checklist-detail";
import { AlertTriangle } from "lucide-react";

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

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(p.payload?.matrix_khoi) },
      { title: "Theo chức năng phòng", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
      { title: "Theo cách thức giám sát", rows: toCompareRows(p.payload?.matrix_cach_thuc) },
    ],
    [p.payload],
  );

  return (
    <div className="space-y-[var(--bv103-space-3)] pb-8">
      {p.loadError ? (
        <div className={`${UI.inset} border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{p.loadError}</div>
      ) : null}

      <GscChecklistNavigator
        payload={p.payload}
        loading={p.loading}
        selectedMaBk={selectedMaBk}
        onSelectMaBk={onSelectMaBk}
        bkLabelRecord={p.bkLabelRecord}
        limit={5}
      />

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

      <section className="w-full min-w-0">
        <header className="mb-4">
          <h2 className="bv103-type-section text-slate-800">Thống kê theo khoa</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tỷ lệ tuân thủ và khối lượng khảo sát — đủ mã khoa trong phạm vi lọc; khoa dưới 80% được tô cảnh báo.
            {p.khoaFilterLocked ? " Phạm vi khoa đang khóa." : ""}
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={gapKhoaRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="GSC"
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
        />
      </section>

      <details className={`${UI.shell} group`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Xem thêm
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Bao phủ tự giám sát · xu hướng · so sánh khối/nghề
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
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
              { label: "Tỷ lệ tuân thủ", value: formatPercent2FromRatio(p.payload?.kpis?.tong_dat ?? 0, p.payload?.kpis?.tong_quan_sat ?? 0) },
            ]}
          />
          <SupervisionTrendChart
            title="Xu hướng tuân thủ (gộp)"
            data={p.payload?.trendline ?? []}
            loading={p.loading}
            source="gsc"
          />
          {(p.payload?.top_violations?.length ?? 0) > 0 ? (
            <div className={`${UI.inset} p-3`}>
              <h4 className="mb-2 flex items-center gap-2 bv103-type-section text-slate-800">
                <AlertTriangle size={16} className="text-red-500" /> Top vi phạm (mọi BK)
              </h4>
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {p.payload?.top_violations?.map((v, i) => (
                  <div key={v.criterion_id || i} className="rounded-lg border border-slate-100 p-2 text-sm">
                    <p className="font-semibold text-slate-800">{v.ten_tieu_chi}</p>
                    <p className="text-xs text-slate-500">
                      {v.ma_bk ?? v.ten_bang_kiem} · {formatPercent2(v.ty_le_vi_pham)} không đạt
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <SupervisionCompareAccordion sections={compareSections} loading={p.loading} />
        </div>
      </details>
    </div>
  );
}
