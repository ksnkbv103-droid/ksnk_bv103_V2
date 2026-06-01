/**
 * Giám sát tuân thủ — Scoring Engine (Pure Functions)
 *
 * Slice 4 (giam-sat-tuan-thu reform v4 / JCI 8.0).
 *
 * 4 thuật toán tính điểm theo `gstt_dm_bang_kiem.cach_tinh_diem`:
 *   - TY_LE         (PERCENTAGE)  — % DAT trên tổng (loại trừ NA/KPA), ánh xạ score 0..100.
 *   - TRON_GOI      (ALL_OR_NONE) — Care Bundle: PASS chỉ khi mọi tiêu chí then chốt DAT.
 *   - DAT_KHONG_DAT (PASS_FAIL)   — chỉ trả Boolean Đạt/Không Đạt theo ngưỡng critical.
 *   - NHAT_KY       (LOG_ENTRY)   — không tính rate; chỉ ghi nhận giá trị + cảnh báo OOR.
 *
 * KHÔNG phụ thuộc Supabase / Next.js — tái dùng giữa write action (Slice 5),
 * dashboard RPC v3 (Slice 7), spec test, và preview UI.
 *
 * Scoring GSC: `docs/wiki/concepts.md` + `docs/modules/giam-sat/bang-kiem-overview.md`.
 */

import type { ChecklistResultValue } from "@/modules/giam-sat-chung/types";

export type GsttCachTinhDiem = "TY_LE" | "TRON_GOI" | "DAT_KHONG_DAT" | "NHAT_KY";

/**
 * Một mục kết quả mở rộng cho engine. Tương thích superset của
 * `ChecklistResult` (trường legacy `value/criterionId`) + flag JCI 8.0.
 */
export interface GsttScoringInputItem {
  criterionId: string;
  value: ChecklistResultValue;
  /** Tiêu chí then chốt (la_then_chot) — bắt buộc DAT cho cach_tinh_diem='TRON_GOI'. */
  la_then_chot?: boolean;
  /** kieu_du_lieu='SO_LIEU' — giá trị numeric (LOG_ENTRY). */
  gia_tri_so?: number | null;
  /** Range hợp lệ cho kieu_du_lieu='SO_LIEU' (NHAT_KY out-of-range alert). */
  nguong_min?: number | null;
  nguong_max?: number | null;
}

export interface GsttScoringSessionMeta {
  /** ISO datetime — anti-Hawthorne detect. */
  thoi_gian_bat_dau?: string | null;
  thoi_gian_ket_thuc?: string | null;
}

export interface GsttScoringOutput {
  cach_tinh_diem: GsttCachTinhDiem;
  /** % 0..100 cho TY_LE; null cho các loại khác. */
  ty_le_percent: number | null;
  /** Boolean cho TRON_GOI (care bundle); null khi KHÔNG phải TRON_GOI. */
  dat_tron_goi: boolean | null;
  /** Boolean Đạt/Không cho DAT_KHONG_DAT; null khi không phải. */
  ket_qua_pass_fail: boolean | null;
  /** Số tiêu chí ngoài ngưỡng (out-of-range) cho NHAT_KY. */
  so_oor: number;
  /** Anti-Hawthorne flag (tốc độ quá nhanh hoặc start=end). */
  du_lieu_nghi_van: boolean;
  /**
   * `tong_diem` để cập nhật cột legacy của `gstt_fact_chung_sessions`:
   *   - TY_LE: bằng `ty_le_percent` (0..100)
   *   - TRON_GOI: 100 nếu PASS, 0 nếu FAIL
   *   - DAT_KHONG_DAT: 100 nếu Đạt, 0 nếu Không
   *   - NHAT_KY: null (không tính rate)
   */
  tong_diem: number | null;
}

const HAWTHORNE_THRESHOLD_PER_MIN = 30;

function isEvaluable(item: GsttScoringInputItem): boolean {
  return item.value !== "NA";
}

function detectSuspiciousData(
  results: readonly GsttScoringInputItem[],
  meta?: GsttScoringSessionMeta,
): boolean {
  const start = meta?.thoi_gian_bat_dau ? Date.parse(meta.thoi_gian_bat_dau) : NaN;
  const end = meta?.thoi_gian_ket_thuc ? Date.parse(meta.thoi_gian_ket_thuc) : NaN;
  if (Number.isFinite(start) && Number.isFinite(end)) {
    if (start === end) return true;
    const minutes = Math.max(0, (end - start) / 60000);
    if (minutes > 0 && results.length / minutes > HAWTHORNE_THRESHOLD_PER_MIN) return true;
  }
  return false;
}

/** TY_LE — PERCENTAGE: %DAT trên tổng evaluable (loại NA). */
export function scoreTyLe(results: readonly GsttScoringInputItem[]): number {
  const evaluable = (results || []).filter(isEvaluable);
  if (evaluable.length === 0) return 0;
  const dat = evaluable.filter((r) => r.value === "DAT").length;
  return Math.round((dat / evaluable.length) * 100);
}

/**
 * TRON_GOI — ALL_OR_NONE Care Bundle.
 *   - Nếu có ít nhất 1 tiêu chí `la_then_chot=true` → PASS chỉ khi MỌI then chốt DAT (NA bỏ qua).
 *   - Nếu không có tiêu chí then chốt nào → fallback: MỌI tiêu chí evaluable phải DAT.
 *   - Trả null khi không có tiêu chí evaluable (không tính được).
 */
export function scoreTronGoi(results: readonly GsttScoringInputItem[]): boolean | null {
  const all = results || [];
  if (all.length === 0) return null;
  const thenChot = all.filter((r) => r.la_then_chot === true && r.value !== "NA");
  if (thenChot.length > 0) {
    return thenChot.every((r) => r.value === "DAT");
  }
  const evaluable = all.filter(isEvaluable);
  if (evaluable.length === 0) return null;
  return evaluable.every((r) => r.value === "DAT");
}

/**
 * DAT_KHONG_DAT — PASS_FAIL: Đạt khi MỌI tiêu chí evaluable DAT.
 * Khác TRON_GOI ở chỗ KHÔNG tách then chốt — toàn bộ tiêu chí phải Đạt.
 */
export function scoreDatKhongDat(results: readonly GsttScoringInputItem[]): boolean | null {
  const evaluable = (results || []).filter(isEvaluable);
  if (evaluable.length === 0) return null;
  return evaluable.every((r) => r.value === "DAT");
}

/**
 * NHAT_KY — LOG_ENTRY: không tính rate, chỉ đếm số tiêu chí số liệu nằm
 * ngoài ngưỡng cho phép (so_oor). UI Slice 5 sẽ highlight đỏ.
 */
export function scoreNhatKy(results: readonly GsttScoringInputItem[]): { so_oor: number } {
  let oor = 0;
  for (const r of results || []) {
    if (typeof r.gia_tri_so !== "number" || !Number.isFinite(r.gia_tri_so)) continue;
    if (typeof r.nguong_min === "number" && r.gia_tri_so < r.nguong_min) {
      oor += 1;
      continue;
    }
    if (typeof r.nguong_max === "number" && r.gia_tri_so > r.nguong_max) {
      oor += 1;
    }
  }
  return { so_oor: oor };
}

/** Engine entrypoint — dispatch theo `cach_tinh_diem`. */
export function computeScore(
  cachTinhDiem: GsttCachTinhDiem,
  results: readonly GsttScoringInputItem[],
  meta?: GsttScoringSessionMeta,
): GsttScoringOutput {
  const du_lieu_nghi_van = detectSuspiciousData(results, meta);
  switch (cachTinhDiem) {
    case "TY_LE": {
      const pct = scoreTyLe(results);
      return {
        cach_tinh_diem: "TY_LE",
        ty_le_percent: pct,
        dat_tron_goi: null,
        ket_qua_pass_fail: null,
        so_oor: 0,
        du_lieu_nghi_van,
        tong_diem: pct,
      };
    }
    case "TRON_GOI": {
      const pass = scoreTronGoi(results);
      return {
        cach_tinh_diem: "TRON_GOI",
        ty_le_percent: null,
        dat_tron_goi: pass,
        ket_qua_pass_fail: null,
        so_oor: 0,
        du_lieu_nghi_van,
        tong_diem: pass === null ? null : pass ? 100 : 0,
      };
    }
    case "DAT_KHONG_DAT": {
      const ok = scoreDatKhongDat(results);
      return {
        cach_tinh_diem: "DAT_KHONG_DAT",
        ty_le_percent: null,
        dat_tron_goi: null,
        ket_qua_pass_fail: ok,
        so_oor: 0,
        du_lieu_nghi_van,
        tong_diem: ok === null ? null : ok ? 100 : 0,
      };
    }
    case "NHAT_KY": {
      const { so_oor } = scoreNhatKy(results);
      return {
        cach_tinh_diem: "NHAT_KY",
        ty_le_percent: null,
        dat_tron_goi: null,
        ket_qua_pass_fail: null,
        so_oor,
        du_lieu_nghi_van,
        tong_diem: null,
      };
    }
    default: {
      // Fallback: treat as TY_LE để giữ phiên cũ.
      const pct = scoreTyLe(results);
      return {
        cach_tinh_diem: "TY_LE",
        ty_le_percent: pct,
        dat_tron_goi: null,
        ket_qua_pass_fail: null,
        so_oor: 0,
        du_lieu_nghi_van,
        tong_diem: pct,
      };
    }
  }
}
