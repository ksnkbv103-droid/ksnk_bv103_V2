"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { GscChecklistNavigator } from "./GscChecklistNavigator";
import { GscBkAnalyticsDashboard } from "./GscBkAnalyticsDashboard";
import GscTgsCoverageRankingPanel from "./GscTgsCoverageRankingPanel";
import { useGscChecklistDetail } from "../hooks/use-gsc-checklist-detail";
import { AlertTriangle } from "lucide-react";

type FilterProps = {
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  bangKiemOptions: { id: string; label: string }[];
  selectedBangKiemMas: string[];
  setSelectedBangKiemMas: (v: string[]) => void;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  setSelectedKhoiIds: (v: string[]) => void;
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  setSelectedNgheIds: (v: string[]) => void;
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  setSelectedKhuVucIds: (v: string[]) => void;
  selectedHinhThucIds: string[];
  setSelectedHinhThucIds: (v: string[]) => void;
};

type Props = FilterProps & {
  payload: GscStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  bkLabelRecord?: Record<string, string>;
  onRefresh?: () => void;
  khoaFilterLocked?: boolean;
};

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
    <div className="space-y-6 pb-8">
      <AnalyticsFilterBar
        variant="compact"
        khoaFilterLocked={p.khoaFilterLocked}
        onRefresh={p.onRefresh}
        refreshLoading={p.loading || detailLoading}
        tuNgay={p.tuNgay}
        setTuNgay={p.setTuNgay}
        denNgay={p.denNgay}
        setDenNgay={p.setDenNgay}
        bangKiemOptions={p.bangKiemOptions}
        selectedBangKiemMas={p.selectedBangKiemMas}
        setSelectedBangKiemMas={p.setSelectedBangKiemMas}
        khoiOptions={p.khoiOptions}
        selectedKhoiIds={p.selectedKhoiIds}
        setSelectedKhoiIds={p.setSelectedKhoiIds}
        khoaOptions={p.khoaOptions}
        selectedKhoaIds={p.selectedKhoaIds}
        setSelectedKhoaIds={p.setSelectedKhoaIds}
        ngheOptions={p.ngheOptions}
        selectedNgheIds={p.selectedNgheIds}
        setSelectedNgheIds={p.setSelectedNgheIds}
        khuVucOptions={p.khuVucOptions}
        selectedKhuVucIds={p.selectedKhuVucIds}
        setSelectedKhuVucIds={p.setSelectedKhuVucIds}
        selectedHinhThucIds={p.selectedHinhThucIds}
        setSelectedHinhThucIds={p.setSelectedHinhThucIds}
      />

      {p.loadError ? (
        <div className={`${UI.inset} border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{p.loadError}</div>
      ) : null}

      <GscChecklistNavigator
        payload={p.payload}
        loading={p.loading}
        selectedMaBk={selectedMaBk}
        onSelectMaBk={onSelectMaBk}
        bkLabelRecord={p.bkLabelRecord}
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

      <section className={`${UI.shell} w-full min-w-0 p-4`}>
        <header className="mb-4">
          <h2 className="text-sm font-bold text-slate-800">Thống kê theo khoa</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tỷ lệ tuân thủ và khối lượng khảo sát — đủ mã khoa trong phạm vi lọc; khoa dưới 80% được tô cảnh báo.
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={gapKhoaRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="GSC"
          tgsVolumeLabel="Khảo sát TGS"
          ksnkVolumeLabel="Khảo sát KSNK"
        />
      </section>

      <GscTgsCoverageRankingPanel
        tuNgay={p.tuNgay}
        denNgay={p.denNgay}
        selectedKhoaIds={p.selectedKhoaIds}
      />

      <details className={`${UI.shell} group`}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Tổng hợp chung (mọi BK trong kỳ)
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">KPI · xu hướng · top vi phạm</span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
          <SupervisionKpiRow
            loading={p.loading}
            items={[
              { label: "Phiên giám sát", value: p.payload?.kpis?.tong_phien ?? 0 },
              { label: "Tiêu chí áp dụng", value: p.payload?.kpis?.tong_quan_sat ?? 0 },
              { label: "Vi phạm", value: p.payload?.kpis?.tong_vi_pham ?? 0 },
              { label: "Tỷ lệ tuân thủ", value: formatPercent2(p.payload?.kpis?.ty_le_tuan_thu ?? 0) },
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
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
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
