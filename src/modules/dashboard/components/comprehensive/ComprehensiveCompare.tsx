"use client";

import React, { useMemo } from "react";
import { ClipboardList, Stethoscope } from "lucide-react";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { SupervisionKhoaAnalyticsBlock } from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows } from "@/lib/analytics/supervision-matrix-mappers";
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

  const zoneChartData = useMemo(
    () =>
      (payload?.ipac_zone_compare ?? []).filter((r) => r.ty_le_vst != null || r.ty_le_gsc != null),
    [payload?.ipac_zone_compare],
  );

  const hasVst = (module === "all" || module === "vst") && payload?.sources.vst === "ok" && vstGapRows.length > 0;
  const hasGsc = (module === "all" || module === "gsc") && payload?.sources.gsc === "ok" && gscGapRows.length > 0;
  const hasZone =
    module === "all" && payload?.capabilities.compare_khu_vuc && zoneChartData.length > 0;

  if (!hasVst && !hasGsc && !hasZone) {
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
          lead="Tỷ lệ tuân thủ và khối lượng quan sát theo khoa — hai nguồn: giám sát KSNK và tự giám sát (WHO)."
          rows={vstGapRows}
          moduleLabel="VST"
          ksnkVolumeLabel="Cơ hội KSNK"
          tgsVolumeLabel="Cơ hội TGS"
          showHeader={module === "all"}
        />
      ) : null}

      {hasGsc ? (
        <ModuleKhoaDashboard
          icon={ClipboardList}
          iconClass="text-sky-600"
          title="Giám sát chung (GSC)"
          lead="Tỷ lệ tuân thủ và khối lượng khảo sát theo khoa — hai nguồn: giám sát KSNK và tự giám sát (TGS)."
          rows={gscGapRows}
          moduleLabel="GSC"
          ksnkVolumeLabel="Khảo sát KSNK"
          tgsVolumeLabel="Khảo sát TGS"
          showHeader={module === "all"}
        />
      ) : null}

      {hasZone ? (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
            Phân tích theo vùng IPAC
            <span className="mt-0.5 block text-[11px] font-normal text-slate-400">VST và GSC theo nhóm màu khu vực</span>
          </summary>
          <div className="border-t border-slate-100 px-5 pb-5 pt-3">
            <IpacZoneMiniTable rows={zoneChartData} />
          </div>
        </details>
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

function IpacZoneMiniTable({
  rows,
}: {
  rows: { ten: string; ty_le_vst: number | null; ty_le_gsc: number | null }[];
}) {
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <th className="px-2 py-2">Vùng IPAC</th>
          <th className="px-2 py-2 text-right">VST (%)</th>
          <th className="px-2 py-2 text-right">GSC (%)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ten} className="border-b border-slate-100">
            <td className="px-2 py-2 font-medium text-slate-800">{r.ten}</td>
            <td className="px-2 py-2 text-right tabular-nums">{r.ty_le_vst != null ? `${r.ty_le_vst}%` : "—"}</td>
            <td className="px-2 py-2 text-right tabular-nums">{r.ty_le_gsc != null ? `${r.ty_le_gsc}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
