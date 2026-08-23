"use client";

import React, { useMemo } from "react";
import { ClipboardList, Stethoscope } from "lucide-react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { SupervisionKhoaAnalyticsBlock } from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows } from "@/lib/analytics/supervision-matrix-mappers";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type ComprehensiveCompareProps = {
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  /** Hiển thị một module — dùng khi tách section VST/GSC trên báo cáo. */
  module?: "vst" | "gsc" | "all";
};

export function ComprehensiveCompare({
  payload,
  selectedKhoaIds,
  khoaOptions,
  module = "all",
}: ComprehensiveCompareProps) {
  const vstGapRows = useMemo(
    () =>
      buildGapKhoaRows(payload?.vst?.gap_analysis, selectedKhoaIds, khoaOptions, khoaOptions.length),
    [payload?.vst?.gap_analysis, selectedKhoaIds, khoaOptions],
  );

  const gscGapRows = useMemo(
    () =>
      buildGapKhoaRows(payload?.gsc?.gap_analysis, selectedKhoaIds, khoaOptions, khoaOptions.length),
    [payload?.gsc?.gap_analysis, selectedKhoaIds, khoaOptions],
  );

  const hasVst = (module === "all" || module === "vst") && payload?.sources.vst === "ok" && vstGapRows.length > 0;
  const hasGsc = (module === "all" || module === "gsc") && payload?.sources.gsc === "ok" && gscGapRows.length > 0;

  if (!hasVst && !hasGsc) {
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
      {hasVst ? (
        <ModuleKhoaDashboard
          icon={Stethoscope}
          iconClass="text-emerald-600"
          title="Giám sát vệ sinh tay (VST)"
          lead="Tỷ lệ tuân thủ và khối lượng quan sát theo khoa — hai nguồn: chuyên trách và tự giám sát (WHO)."
          rows={vstGapRows}
          moduleLabel="VST"
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.vstKsnkVol}
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.vstTgsVol}
          showHeader={module === "all"}
        />
      ) : null}

      {hasGsc ? (
        <ModuleKhoaDashboard
          icon={ClipboardList}
          iconClass="text-sky-600"
          title="Giám sát chung (GSC)"
          lead="Tỷ lệ tuân thủ và khối lượng khảo sát theo khoa — hai nguồn: chuyên trách và tự giám sát."
          rows={gscGapRows}
          moduleLabel="GSC"
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
          showHeader={module === "all"}
        />
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
      />
    </section>
  );
}
