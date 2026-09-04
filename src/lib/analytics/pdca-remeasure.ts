/**
 * PDCA — so giá trị lúc tạo việc vs chỉ số hiện tại (cùng khóa chi_so).
 * D10: `ty_le_ccs` / CCS đã quarantine khỏi resolve/label/export điều hành.
 * Làm tròn: VST 1 chữ số; GSC 2 chữ số; rate NKBV /1000 → 2 chữ số.
 */

import { roundPercent1, roundPercent2 } from "@/lib/analytics/supervision-percent";
import { ratePer1000, roundRate2 } from "@/modules/giam-sat-nkbv/lib/nkbv-rate-display";

function round1(n: number): number {
  return roundPercent1(n);
}

/** Δ = hiện tại − lúc tạo (điểm % hoặc đơn vị đếm tùy chỉ số). */
export function computePdcaDelta(
  giaTriLucTao: number | null | undefined,
  giaTriHienTai: number | null | undefined,
): number | null {
  if (giaTriLucTao == null || giaTriHienTai == null) return null;
  if (!Number.isFinite(giaTriLucTao) || !Number.isFinite(giaTriHienTai)) return null;
  return round1(giaTriHienTai - giaTriLucTao);
}

/** Nhãn nghiệp vụ cho khóa `analytics_meta.chi_so` (UI — không mono raw). */
export function labelAnalyticsChiSo(chiSo: string): string {
  const key = String(chiSo || "").trim();
  // D10 quarantine — không lộ nhãn CCS trên UI user.
  if (key === "ty_le_ccs") return "Chỉ số đã ngừng dùng";
  const map: Record<string, string> = {
    ty_le_vst: "Tỷ lệ VST",
    ty_le_gsc: "Tỷ lệ GSC",
    cssd_red_alert: "Cảnh báo đỏ CSSD",
    nkbv_cho_xn: "NKBV chờ xác nhận",
  };
  return map[key] || key;
}

/**
 * Resolve giá trị hiện tại từ context Command Center đã fetch (không gọi DB thêm).
 * `ty_le_*` = %; `cssd_red_alert` / `nkbv_cho_xn` = đếm.
 * D10: `ty_le_ccs` luôn null (đã gỡ khỏi resolve điều hành).
 */
export function resolveCurrentAnalyticsMetric(
  chiSo: string,
  ctx: {
    tyLeVst?: number | null;
    tyLeGsc?: number | null;
    cssdRedAlert?: number | null;
    nkbvChoXn?: number | null;
    /** % KSNK theo khoa (gap) khi có khoa_id. */
    khoaTyLeById?: Record<string, { ty_le_vst?: number | null; ty_le_gsc?: number | null }>;
    khoaId?: string | null;
  },
): number | null {
  const key = String(chiSo || "").trim();
  // D10 quarantine — không resolve CCS cho surface/PDCA điều hành.
  if (key === "ty_le_ccs") return null;
  const kid = ctx.khoaId?.trim() || "";
  if (kid && ctx.khoaTyLeById?.[kid]) {
    const row = ctx.khoaTyLeById[kid];
    if (key === "ty_le_vst" && row.ty_le_vst != null) return roundPercent1(Number(row.ty_le_vst));
    if (key === "ty_le_gsc" && row.ty_le_gsc != null) return roundPercent2(Number(row.ty_le_gsc));
  }
  if (key === "ty_le_vst") return ctx.tyLeVst != null ? roundPercent1(Number(ctx.tyLeVst)) : null;
  if (key === "ty_le_gsc") return ctx.tyLeGsc != null ? roundPercent2(Number(ctx.tyLeGsc)) : null;
  if (key === "cssd_red_alert") return ctx.cssdRedAlert != null ? Number(ctx.cssdRedAlert) : null;
  if (key === "nkbv_cho_xn") return ctx.nkbvChoXn != null ? Number(ctx.nkbvChoXn) : null;
  return null;
}

/**
 * SIR pool (NHSN / domain SSOT) = Σ observed / Σ expected — **không** trung bình SIR theo khoa.
 * RPC chỉ trả `*_sir` đã làm tròn; expected suy từ obs/SIR khi SIR > 0, hoặc dùng `pred_*` nếu có.
 * Hàng SIR null (predicted < 1, SSOT §18.4) không gộp vào mẫu số pool.
 */
function poolSirRatio(
  rows: Array<Record<string, unknown>>,
  obsKey: string,
  sirKey: string,
  predKey?: string,
): number | null {
  let obsSum = 0;
  let expSum = 0;
  for (const r of rows) {
    const obsRaw = Number(r[obsKey] ?? 0);
    const obs = Number.isFinite(obsRaw) && obsRaw > 0 ? obsRaw : 0;

    let expected: number | null = null;
    if (predKey) {
      const pred = Number(r[predKey]);
      if (Number.isFinite(pred) && pred > 0) expected = pred;
    }
    if (expected == null) {
      const sir = Number(r[sirKey]);
      if (!Number.isFinite(sir) || sir <= 0 || obs <= 0) continue;
      expected = obs / sir;
    }
    if (expected == null || !Number.isFinite(expected) || expected <= 0) continue;
    obsSum += obs;
    expSum += expected;
  }
  if (expSum <= 0) return null;
  return roundRate2(obsSum / expSum);
}

/** Tóm tắt rate/SIR từ epidemiologyRates RPC — null khi thiếu mẫu số. */
export function summarizeNkbvOutcomeRates(
  rates: Array<Record<string, unknown>> | null | undefined,
): {
  clabsi_rate_per_1000: number | null;
  cauti_rate_per_1000: number | null;
  clabsi_sir: number | null;
  cauti_sir: number | null;
  summary: string | null;
} {
  const rows = rates || [];
  if (rows.length === 0) {
    return {
      clabsi_rate_per_1000: null,
      cauti_rate_per_1000: null,
      clabsi_sir: null,
      cauti_sir: null,
      summary: null,
    };
  }
  let cvc = 0;
  let foley = 0;
  let clabsi = 0;
  let cauti = 0;
  for (const r of rows) {
    cvc += Number(r.obs_cvc_days || 0);
    foley += Number(r.obs_foley_days || 0);
    clabsi += Number(r.obs_clabsi_cases || 0);
    cauti += Number(r.obs_cauti_cases || 0);
  }
  const clabsiRate = ratePer1000(clabsi, cvc);
  const cautiRate = ratePer1000(cauti, foley);
  const clabsiSir = poolSirRatio(rows, "obs_clabsi_cases", "clabsi_sir", "pred_clabsi");
  const cautiSir = poolSirRatio(rows, "obs_cauti_cases", "cauti_sir", "pred_cauti");
  const parts: string[] = [];
  if (clabsiRate != null) {
    parts.push(`CLABSI ${clabsiRate}/1000 CVC-d${clabsiSir != null ? ` · SIR ${clabsiSir}` : ""}`);
  }
  if (cautiRate != null) {
    parts.push(`CAUTI ${cautiRate}/1000 Foley-d${cautiSir != null ? ` · SIR ${cautiSir}` : ""}`);
  }
  return {
    clabsi_rate_per_1000: clabsiRate,
    cauti_rate_per_1000: cautiRate,
    clabsi_sir: clabsiSir,
    cauti_sir: cautiSir,
    summary: parts.length > 0 ? parts.join(" · ") : null,
  };
}
