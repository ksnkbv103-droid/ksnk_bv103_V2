import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

const CCS_WEIGHT_VST = 0.5;
const CCS_WEIGHT_GSC = 0.5;

export function rateFromTotals(dat: number, tong: number): number | null {
  if (tong <= 0) return null;
  return Math.round((dat / tong) * 1000) / 10;
}

export function computeTyLeVst(kpis: VstStrategicPayload["kpis"] | undefined): number | null {
  if (!kpis || kpis.tong_co_hoi <= 0) return null;
  return kpis.ty_le_tuan_thu;
}

export function computeTyLeGsc(kpis: GscStrategicPayload["kpis"] | undefined): number | null {
  if (!kpis || kpis.tong_quan_sat <= 0) return null;
  return kpis.ty_le_tuan_thu;
}

/** CCS chỉ từ VST+GSC (process); NKBV là outcome riêng. */
export function computeCcs(
  tyLeVst: number | null,
  tyLeGsc: number | null,
): { value: number | null; note: string | null } {
  if (tyLeVst == null && tyLeGsc == null) return { value: null, note: null };
  if (tyLeVst != null && tyLeGsc != null) {
    const value = Math.round((tyLeVst * CCS_WEIGHT_VST + tyLeGsc * CCS_WEIGHT_GSC) * 10) / 10;
    return {
      value,
      note: `Công thức: ${Math.round(CCS_WEIGHT_VST * 100)}% Tuân thủ VST + ${Math.round(CCS_WEIGHT_GSC * 100)}% Tuân thủ GSC`,
    };
  }
  const single = tyLeVst ?? tyLeGsc;
  return {
    value: single,
    note: tyLeVst != null ? "Chỉ có dữ liệu VST trong phạm vi quyền/lọc" : "Chỉ có dữ liệu GSC trong phạm vi quyền/lọc",
  };
}

export function deltaFromTrend(tyLeSeries: number[]): number | null {
  const valid = tyLeSeries.filter((x) => Number.isFinite(x));
  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2];
  const cur = valid[valid.length - 1];
  return Math.round((cur - prev) * 10) / 10;
}
