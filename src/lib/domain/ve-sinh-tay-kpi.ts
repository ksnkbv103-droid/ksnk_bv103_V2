/**
 * Ba KPI cạnh nhau khối Vệ sinh tay — không gộp 1 %.
 * VST = strategic WHO; GSC = lọc theo ma_bk BM.07.02 / BM.07.03 từ overview.
 */

import { resolveChecklistOverview } from "@/lib/analytics/gsc-analytics-data";
import { buildGscAnalyticsDeepLink } from "@/lib/analytics/supervision-deep-link";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { VE_SINH_TAY_ENTRIES, type VeSinhTayQtMa } from "./ve-sinh-tay-catalog";

export type VeSinhTayKpiCard = {
  qtMa: VeSinhTayQtMa;
  label: string;
  catalogMaBk: string | null;
  tyLe: number | null;
  volumeNote: string | null;
  /** Deep-link thống kê khi có dữ liệu. */
  statsHref: string;
};

function pickBkRow(gsc: GscStrategicPayload | null | undefined, maBk: string) {
  const rows = resolveChecklistOverview(gsc);
  const key = maBk.toUpperCase();
  return rows.find((r) => String(r.ma_bk ?? "").trim().toUpperCase() === key) ?? null;
}

export function buildVeSinhTayKpiCards(input: {
  vst: VstStrategicPayload | null | undefined;
  gsc: GscStrategicPayload | null | undefined;
}): VeSinhTayKpiCard[] {
  const vstK = input.vst?.kpis;
  return VE_SINH_TAY_ENTRIES.map((entry) => {
    if (entry.kind === "who") {
      return {
        qtMa: entry.qtMa,
        label: entry.label,
        catalogMaBk: null,
        tyLe: vstK?.ty_le_tuan_thu ?? null,
        volumeNote:
          vstK != null
            ? `${vstK.da_tuan_thu.toLocaleString()}/${vstK.tong_co_hoi.toLocaleString()} cơ hội`
            : null,
        statsHref: "/thong-ke/vst",
      };
    }
    const row = pickBkRow(input.gsc, entry.catalogMaBk!);
    return {
      qtMa: entry.qtMa,
      label: entry.label,
      catalogMaBk: entry.catalogMaBk,
      tyLe: row?.ty_le_tuan_thu ?? null,
      volumeNote:
        row != null
          ? `${row.tong_dat.toLocaleString()}/${row.tong_quan_sat.toLocaleString()} đạt · ${row.tong_phien} phiên`
          : null,
      statsHref: buildGscAnalyticsDeepLink({}, entry.catalogMaBk!),
    };
  });
}
