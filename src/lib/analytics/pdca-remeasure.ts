/**
 * PDCA — so giá trị lúc tạo việc vs chỉ số hiện tại (cùng khóa chi_so).
 * Không đổi công thức CCS.
 */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
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
  const map: Record<string, string> = {
    ty_le_vst: "Tỷ lệ VST",
    ty_le_gsc: "Tỷ lệ GSC",
    ty_le_ccs: "CCS (nội bộ)",
    cssd_red_alert: "Cảnh báo đỏ CSSD",
    nkbv_cho_xn: "NKBV chờ xác nhận",
  };
  return map[key] || key;
}

/**
 * Resolve giá trị hiện tại từ context Command Center đã fetch (không gọi DB thêm).
 * `ty_le_*` = %; `cssd_red_alert` / `nkbv_cho_xn` = đếm.
 */
export function resolveCurrentAnalyticsMetric(
  chiSo: string,
  ctx: {
    tyLeVst?: number | null;
    tyLeGsc?: number | null;
    tyLeCcs?: number | null;
    cssdRedAlert?: number | null;
    nkbvChoXn?: number | null;
    /** % KSNK theo khoa (gap) khi có khoa_id. */
    khoaTyLeById?: Record<string, { ty_le_vst?: number | null; ty_le_gsc?: number | null }>;
    khoaId?: string | null;
  },
): number | null {
  const key = String(chiSo || "").trim();
  const kid = ctx.khoaId?.trim() || "";
  if (kid && ctx.khoaTyLeById?.[kid]) {
    const row = ctx.khoaTyLeById[kid];
    if (key === "ty_le_vst" && row.ty_le_vst != null) return round1(Number(row.ty_le_vst));
    if (key === "ty_le_gsc" && row.ty_le_gsc != null) return round1(Number(row.ty_le_gsc));
  }
  if (key === "ty_le_vst") return ctx.tyLeVst != null ? round1(Number(ctx.tyLeVst)) : null;
  if (key === "ty_le_gsc") return ctx.tyLeGsc != null ? round1(Number(ctx.tyLeGsc)) : null;
  if (key === "ty_le_ccs") return ctx.tyLeCcs != null ? round1(Number(ctx.tyLeCcs)) : null;
  if (key === "cssd_red_alert") return ctx.cssdRedAlert != null ? Number(ctx.cssdRedAlert) : null;
  if (key === "nkbv_cho_xn") return ctx.nkbvChoXn != null ? Number(ctx.nkbvChoXn) : null;
  return null;
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
  let sirClabsiNum = 0;
  let sirClabsiDen = 0;
  let sirCautiNum = 0;
  let sirCautiDen = 0;
  for (const r of rows) {
    cvc += Number(r.obs_cvc_days || 0);
    foley += Number(r.obs_foley_days || 0);
    clabsi += Number(r.obs_clabsi_cases || 0);
    cauti += Number(r.obs_cauti_cases || 0);
    const sCl = Number(r.clabsi_sir);
    const sCa = Number(r.cauti_sir);
    if (Number.isFinite(sCl) && sCl > 0) {
      sirClabsiNum += sCl;
      sirClabsiDen += 1;
    }
    if (Number.isFinite(sCa) && sCa > 0) {
      sirCautiNum += sCa;
      sirCautiDen += 1;
    }
  }
  const clabsiRate = cvc > 0 ? round1((clabsi / cvc) * 1000) : null;
  const cautiRate = foley > 0 ? round1((cauti / foley) * 1000) : null;
  const clabsiSir = sirClabsiDen > 0 ? round1(sirClabsiNum / sirClabsiDen) : null;
  const cautiSir = sirCautiDen > 0 ? round1(sirCautiNum / sirCautiDen) : null;
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
