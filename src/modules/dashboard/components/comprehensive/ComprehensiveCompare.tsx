"use client";

import React, { useMemo, useState } from "react";
import { ClipboardList, Stethoscope } from "lucide-react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { SupervisionKhoaAnalyticsBlock } from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, type GapKhoaSourceRow } from "@/lib/analytics/supervision-matrix-mappers";
import { PCT_SURFACE_LABEL, SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import { SupervisionSourceLensToggle } from "@/lib/analytics/SupervisionSourceLensToggle";
import { SupervisionActionDeepLink } from "@/lib/analytics/SupervisionActionDeepLink";
import {
  gapRowsWithLensData,
  maskGapRowsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type ComprehensiveCompareProps = {
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  /** Hiển thị một module — dùng khi tách section VST/GSC trên báo cáo. */
  module?: "vst" | "gsc" | "all";
  /** Gap của một BM (BM.02/03). Không truyền → gap module trên payload. */
  gapOverride?: GapKhoaSourceRow[] | null;
  blockTitle?: string;
  subjectHref?: string;
  subjectLinkLabel?: string;
  /** Khối GSC chung: pool mọi BK, không đứng cạnh 3 KPI VST. */
  poolCaption?: boolean;
};

export function ComprehensiveCompare({
  payload,
  selectedKhoaIds,
  khoaOptions,
  module = "all",
  gapOverride,
  blockTitle,
  subjectHref,
  subjectLinkLabel = "Đối tượng và khu vực",
  poolCaption = false,
}: ComprehensiveCompareProps) {
  const [vstLens, setVstLens] = useState<SupervisionSourceLens>("ksnk");
  const [gscLens, setGscLens] = useState<SupervisionSourceLens>("ksnk");

  const vstChartRows = useMemo(() => {
    const source = module === "vst" && gapOverride ? gapOverride : payload?.vst?.gap_analysis;
    const rows = buildGapKhoaRows(source, selectedKhoaIds, khoaOptions, khoaOptions.length);
    return maskGapRowsForLens(gapRowsWithLensData(rows, vstLens), vstLens);
  }, [gapOverride, module, payload?.vst?.gap_analysis, selectedKhoaIds, khoaOptions, vstLens]);
  const gscChartRows = useMemo(() => {
    const source = module === "gsc" && gapOverride ? gapOverride : payload?.gsc?.gap_analysis;
    const rows = buildGapKhoaRows(source, selectedKhoaIds, khoaOptions, khoaOptions.length);
    return maskGapRowsForLens(gapRowsWithLensData(rows, gscLens), gscLens);
  }, [gapOverride, module, payload?.gsc?.gap_analysis, selectedKhoaIds, khoaOptions, gscLens]);

  const showVst = (module === "all" || module === "vst") && payload?.sources.vst === "ok";
  const showGsc = (module === "all" || module === "gsc") && payload?.sources.gsc === "ok";
  const hasVstChart = showVst && vstChartRows.length > 0;
  const hasGscChart = showGsc && gscChartRows.length > 0;

  if (!showVst && !showGsc) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
        {module === "vst"
          ? "Chưa có dữ liệu VST theo khoa trong phạm vi lọc."
          : module === "gsc"
            ? "Chưa có dữ liệu GSC theo khoa trong phạm vi lọc."
            : "Chưa có dữ liệu phân tích theo khoa trong phạm vi lọc."}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {blockTitle || subjectHref ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          {blockTitle ? <h3 className="bv103-type-section text-slate-800">{blockTitle}</h3> : <span />}
          {subjectHref ? (
            <a href={subjectHref} className="text-xs font-semibold text-emerald-700 hover:underline">
              {subjectLinkLabel}
            </a>
          ) : null}
        </div>
      ) : null}
      {poolCaption ? (
        <p className="text-[11px] text-slate-500">
          So sánh khoa · {PCT_SURFACE_LABEL.gscPool}. Tách khỏi 3 KPI vệ sinh tay.
        </p>
      ) : null}
      {showVst ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SupervisionSourceLensToggle value={vstLens} onChange={setVstLens} />
            {subjectHref ? null : <SupervisionActionDeepLink source="vst" />}
          </div>
          {hasVstChart ? (
            <ModuleKhoaDashboard
              icon={Stethoscope}
              iconClass="text-emerald-600"
              title="Giám sát vệ sinh tay (VST)"
              lead="Một nguồn mỗi lần — đổi nút Chuyên trách / Tự giám sát. Tab tỷ lệ hoặc khối lượng."
              rows={vstChartRows}
              moduleLabel="VST"
              ksnkVolumeLabel={SUPERVISION_SOURCE_UI.vstKsnkVol}
              tgsVolumeLabel={SUPERVISION_SOURCE_UI.vstTgsVol}
              showHeader={module === "all"}
              sourceLens={vstLens}
            />
          ) : (
            <p className="text-xs text-slate-500">Chưa đủ dữ liệu biểu đồ khoa VST cho nguồn đang chọn.</p>
          )}
        </div>
      ) : null}

      {showGsc ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SupervisionSourceLensToggle value={gscLens} onChange={setGscLens} />
            {subjectHref ? null : <SupervisionActionDeepLink source="gsc" />}
          </div>
          {hasGscChart ? (
            <ModuleKhoaDashboard
              icon={ClipboardList}
              iconClass="text-sky-600"
              title="Giám sát chung (GSC)"
              lead="Một nguồn mỗi lần — đổi nút Chuyên trách / Tự giám sát. Tab tỷ lệ hoặc khối lượng."
              rows={gscChartRows}
              moduleLabel="GSC"
              ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
              tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
              showHeader={module === "all"}
              sourceLens={gscLens}
            />
          ) : (
            <p className="text-xs text-slate-500">Chưa đủ dữ liệu biểu đồ khoa GSC cho nguồn đang chọn.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ModuleKhoaDashboard({
  icon: Icon,
  iconClass,
  title,
  lead,
  rows,
  moduleLabel,
  ksnkVolumeLabel,
  tgsVolumeLabel,
  showHeader = true,
  sourceLens,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  title: string;
  lead: string;
  rows: ReturnType<typeof buildGapKhoaRows>;
  moduleLabel: string;
  ksnkVolumeLabel: string;
  tgsVolumeLabel: string;
  showHeader?: boolean;
  sourceLens?: "ksnk" | "tgs";
}) {
  return (
    <section className={showHeader ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm" : ""}>
      {showHeader ? (
        <header className="mb-4">
          <h3 className={`flex items-center gap-2 ${D.sectionHeading}`}>
            <Icon size={18} className={iconClass} aria-hidden />
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{lead}</p>
        </header>
      ) : null}
      <SupervisionKhoaAnalyticsBlock
        rows={rows}
        moduleLabel={moduleLabel}
        ksnkVolumeLabel={ksnkVolumeLabel}
        tgsVolumeLabel={tgsVolumeLabel}
        sourceLens={sourceLens}
      />
    </section>
  );
}
