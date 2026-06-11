"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import {
  SupervisionCompareGrid,
  SupervisionGapChart,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { toCompareRows, mapGapRowsForKhoaMa } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";

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
  checklistClusters?: Record<string, GscStrategicPayload>;
  clustersLoading?: boolean;
  truncatedChecklistCount?: number;
  pendingClusterCount?: number;
  clustersRequested?: boolean;
  onRequestChecklistClusters?: () => void;
  bkLabelRecord?: Record<string, string>;
  onRefresh?: () => void;
};

function GscAnalyticsBody({
  payload,
  loading,
  title,
}: {
  payload: GscStrategicPayload | null;
  loading?: boolean;
  title?: string;
}) {
  const compareSections = useMemo(
    () => [
      { title: "Theo khoa", rows: toCompareRows(payload?.matrix_khoa, { khoaMa: true }) },
      { title: "Theo vùng IPAC (4 màu)", rows: toCompareRows(payload?.matrix_khu_vuc_nhom) },
      { title: "Theo khu vực (chi tiết)", rows: toCompareRows(payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng", rows: toCompareRows(payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(payload?.matrix_hinh_thuc) },
      { title: "Theo cách thức giám sát", rows: toCompareRows(payload?.matrix_cach_thuc) },
    ],
    [payload],
  );

  return (
    <div className={UI.sectionGap}>
      {title ? (
        <h3 className="border-b border-slate-200 pb-2 text-base font-bold text-slate-800">{title}</h3>
      ) : null}
      <SupervisionKpiRow
        loading={loading}
        items={[
          { label: "Phiên giám sát", value: payload?.kpis?.tong_phien ?? 0 },
          { label: "Tiêu chí áp dụng", value: payload?.kpis?.tong_quan_sat ?? 0 },
          { label: "Tiêu chí đạt", value: payload?.kpis?.tong_dat ?? 0 },
          { label: "Tỷ lệ tuân thủ", value: formatPercent2(payload?.kpis?.ty_le_tuan_thu ?? 0) },
        ]}
      />
      <SupervisionTrendChart title="Xu hướng tuân thủ" data={payload?.trendline ?? []} loading={loading} />
      <SupervisionCompareGrid sections={compareSections} loading={loading} />
      <SupervisionGapChart
        title="Đối soát Tự giám sát vs KSNK (theo khoa)"
        rows={mapGapRowsForKhoaMa(payload?.gap_analysis)}
        loading={loading}
      />
      {(payload?.top_violations?.length ?? 0) > 0 ? (
        <div className={`${UI.shell} p-4`}>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <AlertTriangle size={16} className="text-red-500" /> Top tiêu chí vi phạm
          </h4>
          <div className="max-h-[220px] space-y-2 overflow-y-auto">
            {payload?.top_violations?.map((v, i) => (
              <div key={v.criterion_id || i} className="rounded-lg border border-slate-100 p-2 text-sm">
                <p className="font-semibold text-slate-800">{v.ten_tieu_chi}</p>
                <p className="text-xs text-slate-500">
                  {v.ten_bang_kiem} · {formatPercent2(v.ty_le_vi_pham)} không đạt
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function GscStrategicAnalyticsPanel(p: Props) {
  const clusterEntries = Object.entries(p.checklistClusters ?? {});

  return (
    <div className="space-y-6 px-2 pb-8">
      <div className={`${UI.shell} p-4`}>
        <AnalyticsFilterBar
          onRefresh={p.onRefresh}
          refreshLoading={p.loading || p.clustersLoading}
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
      </div>

      {p.loadError ? (
        <div className={`${UI.inset} border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{p.loadError}</div>
      ) : null}

      <GscAnalyticsBody
        payload={p.payload}
        loading={p.loading}
        title="Tổng hợp (mọi chuyên đề trong kỳ)"
      />

      {(p.truncatedChecklistCount ?? 0) > 0 ? (
        <div className={`${UI.noticeWarning} flex items-center gap-2 p-4`}>
          <AlertTriangle size={16} className="shrink-0 text-amber-600" />
          <p>
            Còn <strong>{p.truncatedChecklistCount} biểu mẫu</strong> ngoài giới hạn 12 — thu hẹp bộ lọc{" "}
            <em>Chuyên đề</em> để xem thêm.
          </p>
        </div>
      ) : null}

      {!p.clustersRequested && (p.pendingClusterCount ?? 0) > 0 ? (
        <div className={`${UI.inset} flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm`}>
          <p className="text-slate-600">
            Thống kê tổng hợp đã tải. Chi tiết theo <strong>{p.pendingClusterCount}</strong> biểu mẫu chưa tự
            động tải (tránh chậm).
          </p>
          <button
            type="button"
            className={UI.btnPrimary}
            onClick={p.onRequestChecklistClusters}
          >
            Tải theo biểu mẫu
          </button>
        </div>
      ) : null}

      {clusterEntries.length > 0 ? (
        <div className={UI.sectionGapLg ?? UI.sectionGap}>
          {clusterEntries.map(([ma, clusterPayload]) => (
            <GscAnalyticsBody
              key={ma}
              payload={clusterPayload}
              loading={p.clustersLoading}
              title={
                p.bkLabelRecord?.[ma] ??
                clusterPayload.dynamic_checklists?.[0]?.ten_bang_kiem ??
                ma
              }
            />
          ))}
        </div>
      ) : p.selectedBangKiemMas.length > 0 && !p.clustersLoading ? (
        <p className="text-sm text-slate-500">Chưa có dữ liệu cho chuyên đề đã chọn trong kỳ lọc.</p>
      ) : null}

      {p.clustersLoading && clusterEntries.length === 0 ? (
        <p className="text-sm text-slate-500">Đang tải thống kê theo từng biểu mẫu…</p>
      ) : null}
    </div>
  );
}

export function GscAnalyticsDeepLinkHint({ href = "/thong-ke/gsc" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline">
      Xem chi tiết tại module GSC <ExternalLink size={12} />
    </Link>
  );
}
