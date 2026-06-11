/**
 * Hiển thị điểm / kết quả GSC — dùng chung form preview và cột lịch sử.
 * Engine tính: `giam-sat-scoring.ts` + fallback legacy weighted.
 */

import { calculateGscComplianceScore } from "@/lib/domain/giam-sat-chung.domain";
import {
  computeScore,
  scoreTyLe,
  type GsttCachTinhDiem,
  type GsttScoringInputItem,
  type GsttScoringSessionMeta,
} from "@/lib/domain/giam-sat-scoring";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";
import type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat } from "../types";
import type { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";

const VALID_CACH = new Set<GsttCachTinhDiem>(["TY_LE", "TRON_GOI", "DAT_KHONG_DAT", "NHAT_KY"]);

export function normalizeCachTinhDiem(raw: unknown): GsttCachTinhDiem | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return VALID_CACH.has(v as GsttCachTinhDiem) ? (v as GsttCachTinhDiem) : null;
}

export function inferCachFromLoaiGiamSat(loai: unknown): GsttCachTinhDiem | null {
  const lg = String(loai ?? "").trim().toUpperCase();
  if (lg === "NHAT_KY_VAN_HANH") return "NHAT_KY";
  if (lg === "DANH_GIA_HE_THONG") return "DAT_KHONG_DAT";
  if (lg === "TUAN_THU" || !lg) return "TY_LE";
  return null;
}

export function mapChecklistToScoringInput(
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
  /** % tuân thủ (đạt / tiêu chí áp dụng); null khi NHAT_KY hoặc chưa đánh giá */
  rate: number | null;
  scoreLabel: string;
  scoreClassName: string;
  duLieuNghiVan?: boolean;
};

function gscRatioTier(pct: number): { label: string; className: string } {
  if (pct >= 90) return { label: "Tốt", className: "text-emerald-700" };
  if (pct >= 80) return { label: "Đạt", className: "text-amber-600" };
  return { label: "Không đạt", className: "text-red-600" };
}

function buildGscRatioFormProgress(
  evaluated: number,
  total: number,
  items: readonly GsttScoringInputItem[],
  duLieuNghiVan: boolean,
): GscFormProgress {
  if (evaluated === 0) {
    return {
      evaluated,
      total,
      rate: null,
      scoreLabel: "Chưa đánh giá",
      scoreClassName: "text-slate-500",
      duLieuNghiVan,
    };
  }
  const pct = scoreTyLe(items);
  const tier = gscRatioTier(pct);
  return {
    evaluated,
    total,
    rate: pct,
    scoreLabel: `${formatPercent2(pct)} · ${tier.label}`,
    scoreClassName: tier.className,
    duLieuNghiVan,
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

  if (!cach && evaluated > 0) {
    const legacy = calculateGscComplianceScore([...results]);
    const tier =
      legacy >= 90 ? { label: "Tốt", className: "text-emerald-700" } : legacy >= 80
        ? { label: "Đạt", className: "text-amber-600" }
        : { label: "Không đạt", className: "text-red-600" };
    return {
      evaluated,
      total,
      rate: legacy,
      scoreLabel: `${legacy}% · ${tier.label}`,
      scoreClassName: tier.className,
    };
  }

  if (!cach) {
    return {
      evaluated,
      total,
      rate: null,
      scoreLabel: "Chưa đánh giá",
      scoreClassName: "text-slate-500",
    };
  }

  const out = computeScore(cach, items, meta);

  switch (cach) {
    case "NHAT_KY":
      return {
        evaluated,
        total,
        rate: null,
        scoreLabel: out.so_oor > 0 ? `Nhật ký · ${out.so_oor} ngoài ngưỡng` : "Nhật ký · trong ngưỡng",
        scoreClassName: out.so_oor > 0 ? "text-red-600" : "text-emerald-700",
        duLieuNghiVan: out.du_lieu_nghi_van,
      };
    case "TRON_GOI": {
      const pass = out.dat_tron_goi;
      if (pass === null) {
        return { evaluated, total, rate: null, scoreLabel: "Chưa đủ tiêu chí", scoreClassName: "text-slate-500" };
      }
      return {
        evaluated,
        total,
        rate: pass ? 100 : 0,
        scoreLabel: pass ? "Care bundle · Đạt" : "Care bundle · Không đạt",
        scoreClassName: pass ? "text-emerald-700" : "text-red-600",
        duLieuNghiVan: out.du_lieu_nghi_van,
      };
    }
    case "DAT_KHONG_DAT": {
      const pass = out.ket_qua_pass_fail;
      if (pass === null) {
        return { evaluated, total, rate: null, scoreLabel: "Chưa đủ tiêu chí", scoreClassName: "text-slate-500" };
      }
      return {
        evaluated,
        total,
        rate: pass ? 100 : 0,
        scoreLabel: pass ? "Đạt" : "Không đạt",
        scoreClassName: pass ? "text-emerald-700" : "text-red-600",
        duLieuNghiVan: out.du_lieu_nghi_van,
      };
    }
    case "TY_LE":
    default: {
      const pct = out.ty_le_percent ?? 0;
      const tier =
        pct >= 90 ? { label: "Tốt", className: "text-emerald-700" } : pct >= 80
          ? { label: "Đạt", className: "text-amber-600" }
          : { label: "Không đạt", className: "text-red-600" };
      return {
        evaluated,
        total,
        rate: pct,
        scoreLabel: `${formatPercent2(pct)} · ${tier.label}`,
        scoreClassName: tier.className,
        duLieuNghiVan: out.du_lieu_nghi_van,
      };
    }
  }
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

/**
 * % hiển thị cột lịch sử — ưu tiên counts live từ `results_jsonb` (view),
 * fallback cờ/tong_diem khi thiếu counts (phiên cũ).
 */
export function resolveGscHistoryCompliancePercent(
  row: Record<string, unknown>,
  cach: GsttCachTinhDiem | null,
): number | null {
  const fromCounts = gscCompliancePercentFromCounts(row.tong_quan_sat, row.tong_dat);
  if (fromCounts != null) return fromCounts;

  const tong = row.tong_diem;
  const tongNum = tong == null || tong === "" ? null : Number(tong);

  if (cach === "TRON_GOI") {
    if (row.dat_tron_goi === true) return 100;
    if (row.dat_tron_goi === false) return 0;
  }
  if (cach === "DAT_KHONG_DAT") {
    if (tongNum === 100) return 100;
    if (tongNum === 0) return 0;
  }
  if (Number.isFinite(tongNum)) return tongNum!;
  return null;
}

/** Cột lịch sử — hiển thị % tuân thủ (2 chữ số thập phân). */
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
  const tier =
    val >= 90 ? { className: "text-emerald-700" } : val >= 80
      ? { className: "text-amber-600" }
      : { className: "text-red-600" };

  return {
    label: `${formatPercent2(val)}${suffix}`,
    className: tier.className,
    title: formatPercent2(val),
  };
}

export type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat };
