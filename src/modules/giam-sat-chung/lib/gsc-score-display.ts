/**
 * Hiển thị điểm GSC — form preview và cột lịch sử.
 * UI chỉ tỷ lệ % (+ Tốt/Đạt/Không đạt). Cờ care bundle lưu DB, không hiện phụ.
 */

import {
  computeScore,
  type GsttCachTinhDiem,
  type GsttScoringInputItem,
  type GsttScoringSessionMeta,
} from "@/lib/domain/giam-sat-scoring";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";
import type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat } from "../types";
import type { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";

const VALID_CACH = new Set<GsttCachTinhDiem>(["TY_LE", "TRON_GOI", "DAT_KHONG_DAT", "NHAT_KY"]);

function normalizeCachTinhDiem(raw: unknown): GsttCachTinhDiem | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return VALID_CACH.has(v as GsttCachTinhDiem) ? (v as GsttCachTinhDiem) : null;
}

function inferCachFromLoaiGiamSat(loai: unknown): GsttCachTinhDiem | null {
  const lg = String(loai ?? "").trim().toUpperCase();
  if (lg === "NHAT_KY_VAN_HANH") return "NHAT_KY";
  if (lg === "DANH_GIA_HE_THONG") return "DAT_KHONG_DAT";
  if (lg === "TUAN_THU" || !lg) return "TY_LE";
  return null;
}

function mapChecklistToScoringInput(
  results: readonly ChecklistResult[],
  criteria: readonly ChecklistCriterion[],
): GsttScoringInputItem[] {
  const critMap = new Map(criteria.map((c) => [c.id, c]));
  return (results || []).map((r) => {
    const c = critMap.get(r.criterionId);
    return {
      criterionId: r.criterionId,
      value: r.value,
      la_then_chot: c?.la_then_chot ?? false,
      gia_tri_so: r.gia_tri_so ?? null,
      nguong_min: c?.nguong_min ?? null,
      nguong_max: c?.nguong_max ?? null,
      weightType: r.weightType,
      isRedFlag: r.isRedFlag,
    };
  });
}

export type GscFormProgress = {
  evaluated: number;
  total: number;
  /** % tiêu chí DAT/(DAT+KHONG_DAT); null khi NHAT_KY / chưa đánh giá */
  rate: number | null;
  scoreLabel: string;
  scoreClassName: string;
  duLieuNghiVan?: boolean;
  /** Care bundle (chỉ TRON_GOI). */
  careBundlePass?: boolean | null;
};

function gscRatioTier(pct: number): { label: string; className: string } {
  if (pct >= 90) return { label: "Tốt", className: "text-emerald-700" };
  if (pct >= 80) return { label: "Đạt", className: "text-amber-600" };
  return { label: "Không đạt", className: "text-red-600" };
}

function withNghiVan(label: string, duLieuNghiVan: boolean): string {
  return duLieuNghiVan ? `${label} · Nghi ngờ` : label;
}

function formatPercentPrimary(
  pct: number,
  nghi: boolean,
  suffix?: string,
): Pick<GscFormProgress, "rate" | "scoreLabel" | "scoreClassName" | "duLieuNghiVan"> {
  const tier = gscRatioTier(pct);
  const extra = suffix ? ` · ${suffix}` : ` · ${tier.label}`;
  return {
    rate: pct,
    scoreLabel: withNghiVan(`${formatPercent2(pct)}${extra}`, nghi),
    scoreClassName: tier.className,
    duLieuNghiVan: nghi,
  };
}

export function previewGscFormProgress(
  results: readonly ChecklistResult[],
  criteria: readonly ChecklistCriterion[],
  cachTinhDiem: unknown,
  meta?: GsttScoringSessionMeta,
  loaiGiamSat?: unknown,
): GscFormProgress {
  const evaluated = results.filter((r) => r.value !== "NA").length;
  const total = criteria.length;
  const cach =
    normalizeCachTinhDiem(cachTinhDiem) ?? inferCachFromLoaiGiamSat(loaiGiamSat);

  const items = mapChecklistToScoringInput(results, criteria);
  const effectiveCach: GsttCachTinhDiem = cach ?? "TY_LE";

  if (evaluated === 0 && effectiveCach !== "NHAT_KY") {
    return {
      evaluated,
      total,
      rate: null,
      scoreLabel: "Chưa đánh giá",
      scoreClassName: "text-slate-500",
    };
  }

  const out = computeScore(effectiveCach, items, meta);
  const nghi = out.du_lieu_nghi_van;

  if (effectiveCach === "NHAT_KY") {
    return {
      evaluated,
      total,
      rate: null,
      scoreLabel: withNghiVan(
        out.so_oor > 0 ? `Nhật ký · ${out.so_oor} ngoài ngưỡng` : "Nhật ký · trong ngưỡng",
        nghi,
      ),
      scoreClassName: out.so_oor > 0 ? "text-red-600" : "text-emerald-700",
      duLieuNghiVan: nghi,
    };
  }

  const pct = out.ty_le_percent ?? out.tong_diem;
  if (pct == null) {
    return {
      evaluated,
      total,
      rate: null,
      scoreLabel: "Chưa đánh giá",
      scoreClassName: "text-slate-500",
      duLieuNghiVan: nghi,
    };
  }

  // GSC UI: chỉ tỷ lệ % (+ nhãn Tốt/Đạt/Không đạt). Cờ care bundle vẫn lưu DB, không hiện phụ.
  return {
    evaluated,
    total,
    ...formatPercentPrimary(pct, nghi),
    careBundlePass: effectiveCach === "TRON_GOI" ? out.dat_tron_goi : undefined,
  };
}

export type GscHistoryScoreDisplay = {
  label: string;
  className: string;
  title?: string;
};

/** % tuân thủ từ counts view — khớp RPC dashboard (`tong_dat / tong_quan_sat`). */
export function gscCompliancePercentFromCounts(
  tongQuanSat: unknown,
  tongDat: unknown,
): number | null {
  const total = Number(tongQuanSat ?? NaN);
  const dat = Number(tongDat ?? NaN);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(dat)) return null;
  return roundPercent2((dat / total) * 100);
}

/** % lịch sử — ưu tiên counts live, rồi `tong_diem` (đã là %). */
export function resolveGscHistoryCompliancePercent(
  row: Record<string, unknown>,
  cach: GsttCachTinhDiem | null,
): number | null {
  if (cach === "NHAT_KY") return null;

  const fromCounts = gscCompliancePercentFromCounts(row.tong_quan_sat, row.tong_dat);
  if (fromCounts != null) return fromCounts;

  const tong = row.tong_diem;
  const tongNum = tong == null || tong === "" ? null : Number(tong);
  if (Number.isFinite(tongNum)) return tongNum!;
  return null;
}

/** Cột lịch sử GSC: chỉ tỷ lệ %. */
export function formatGscHistoryScore(row: Record<string, unknown>): GscHistoryScoreDisplay {
  const cach =
    normalizeCachTinhDiem(row.cach_tinh_diem) ??
    inferCachFromLoaiGiamSat(row.loai_giam_sat);
  const nghiVan = Boolean(row.du_lieu_nghi_van);
  const suffix = nghiVan ? " · Nghi ngờ" : "";

  if (cach === "NHAT_KY") {
    return {
      label: `Nhật ký${suffix}`,
      className: nghiVan ? "text-amber-700" : "text-slate-700",
      title: "Nhật ký vận hành — không tính % tuân thủ",
    };
  }

  const pct = resolveGscHistoryCompliancePercent(row, cach);
  if (pct == null) {
    return { label: "—", className: "text-slate-400" };
  }

  const val = roundPercent2(pct);
  const tier = gscRatioTier(val);
  return {
    label: `${formatPercent2(val)} · ${tier.label}${suffix}`,
    className: tier.className,
    title: formatPercent2(val),
  };
}

export type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat };
