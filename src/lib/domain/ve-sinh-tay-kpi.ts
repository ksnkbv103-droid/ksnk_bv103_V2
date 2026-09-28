/**
 * Ba KPI cạnh nhau khối Vệ sinh tay — không gộp 1 %.
 * VST = strategic WHO; GSC = lọc theo ma_bk (prod KSNK.QT.07.BM.02/03 hoặc alias BM.07.02/03).
 */

import { resolveChecklistOverview } from "@/lib/analytics/gsc-analytics-data";
import {
  buildAnalyticsUrlQuery,
  buildGscAnalyticsDeepLink,
  type AnalyticsUrlSeed,
} from "@/lib/analytics/supervision-deep-link";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import {
  resolveBangKiemMaCandidates,
  VE_SINH_TAY_ENTRIES,
  type VeSinhTayQtMa,
} from "./ve-sinh-tay-catalog";

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
  const candidates = new Set(resolveBangKiemMaCandidates(maBk));
  return (
    rows.find((r) => candidates.has(String(r.ma_bk ?? "").trim().toUpperCase())) ?? null
  );
}

export function buildVeSinhTayKpiCards(input: {
  vst: VstStrategicPayload | null | undefined;
  gsc: GscStrategicPayload | null | undefined;
  /** Kỳ đang mở trên bản ký — deep-link thống kê không được rơi về kỳ mặc định. */
  filters?: AnalyticsUrlSeed;
}): VeSinhTayKpiCard[] {
  const vstK = input.vst?.kpis;
  const seed = input.filters ?? {};
  const vstQuery = buildAnalyticsUrlQuery(seed);
  const vstHref = vstQuery ? `/thong-ke/vst?${vstQuery}` : "/thong-ke/vst";
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
        statsHref: vstHref,
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
      statsHref: buildGscAnalyticsDeepLink(seed, entry.catalogMaBk!),
    };
  });
}
