/** Action board VST/GSC — thấp nhất / cao nhất (điển hình) / lỗi hay gặp. */

export const ACTION_BOARD_MIN_SAMPLE = {
  /** VST: cơ hội quan sát tối thiểu để vào bảng điển hình / xếp hạng hành động */
  vst: 20,
  /** GSC: tiêu chí có áp dụng tối thiểu */
  gsc: 30,
} as const;

export type ActionBoardSource = "vst" | "gsc";

export type ActionBoardRankRow = {
  ten: string;
  tyLe: number;
  tong: number;
  dat: number;
};

export type ActionBoardErrorItem = {
  ten: string;
  detail?: string;
  /** Với moment VST: % tuân thủ thời điểm (thấp = tệ). */
  tyLe?: number | null;
  count?: number;
};

export type ActionBoardModel = {
  source: ActionBoardSource;
  minSample: number;
  lowest: ActionBoardRankRow[];
  highest: ActionBoardRankRow[];
  errors: ActionBoardErrorItem[];
};

export type MatrixKhoaLike = {
  ten?: string | null;
  ma_khoa?: string | null;
  tong_co_hoi?: number | null;
  da_tuan_thu?: number | null;
  tong_quan_sat?: number | null;
  tong_dat?: number | null;
  ty_le_tuan_thu?: number | null;
};

export type MomentLike = {
  ten?: string | null;
  tong_co_hoi?: number | null;
  da_tuan_thu?: number | null;
  ty_le_tuan_thu?: number | null;
};

export type TopViolationLike = {
  ten_tieu_chi?: string | null;
  ma_bk?: string | null;
  ten_bang_kiem?: string | null;
  so_vi_pham?: number | null;
  ty_le_vi_pham?: number | null;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function labelOf(row: MatrixKhoaLike): string {
  const ten = String(row.ten ?? "").trim();
  if (ten) return ten;
  const ma = String(row.ma_khoa ?? "").trim();
  return ma || "—";
}

/** Chuẩn hoá matrix_khoa → hàng xếp hạng (bỏ mẫu số = 0). */
export function rankRowsFromMatrixKhoa(
  rows: MatrixKhoaLike[] | null | undefined,
  source: ActionBoardSource,
): ActionBoardRankRow[] {
  const out: ActionBoardRankRow[] = [];
  for (const r of rows ?? []) {
    const isGsc = source === "gsc" || r.tong_quan_sat != null;
    const tong = num(isGsc ? r.tong_quan_sat : r.tong_co_hoi);
    if (tong <= 0) continue;
    const dat = num(isGsc ? r.tong_dat : r.da_tuan_thu);
    const tyLe = r.ty_le_tuan_thu != null && Number.isFinite(Number(r.ty_le_tuan_thu))
      ? Number(r.ty_le_tuan_thu)
      : tong > 0
        ? (dat / tong) * 100
        : 0;
    out.push({ ten: labelOf(r), tyLe, tong, dat });
  }
  return out;
}

export function pickLowest(rows: ActionBoardRankRow[], minSample: number, limit = 5): ActionBoardRankRow[] {
  return [...rows]
    .filter((r) => r.tong >= minSample)
    .sort((a, b) => a.tyLe - b.tyLe || b.tong - a.tong || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, limit);
}

export function pickHighest(rows: ActionBoardRankRow[], minSample: number, limit = 5): ActionBoardRankRow[] {
  return [...rows]
    .filter((r) => r.tong >= minSample)
    .sort((a, b) => b.tyLe - a.tyLe || b.tong - a.tong || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, limit);
}

export function vstErrorsFromMoments(
  moments: MomentLike[] | null | undefined,
  kpis?: {
    loi_ky_thuat?: number | null;
    bo_sot?: number | null;
    tong_co_hoi?: number | null;
  } | null,
  limit = 5,
): ActionBoardErrorItem[] {
  const fromMoments: ActionBoardErrorItem[] = [...(moments ?? [])]
    .filter((m) => num(m.tong_co_hoi) > 0)
    .map((m) => ({
      ten: String(m.ten ?? "").trim() || "Thời điểm",
      detail: `${num(m.da_tuan_thu)}/${num(m.tong_co_hoi)} cơ hội`,
      tyLe: m.ty_le_tuan_thu == null ? null : Number(m.ty_le_tuan_thu),
    }))
    .sort((a, b) => (a.tyLe ?? 101) - (b.tyLe ?? 101) || a.ten.localeCompare(b.ten, "vi"));

  const errors: ActionBoardErrorItem[] = fromMoments.slice(0, limit);

  const tong = num(kpis?.tong_co_hoi);
  if (tong > 0) {
    const loiKt = num(kpis?.loi_ky_thuat);
    const boSot = num(kpis?.bo_sot);
    if (loiKt > 0) {
      errors.push({
        ten: "Lỗi kỹ thuật (toàn kỳ)",
        detail: `${loiKt}/${tong} cơ hội`,
        count: loiKt,
      });
    }
    if (boSot > 0) {
      errors.push({
        ten: "Bỏ sót (toàn kỳ)",
        detail: `${boSot}/${tong} cơ hội`,
        count: boSot,
      });
    }
  }

  // Ưu tiên moment yếu; KPI tổng chỉ bổ sung nếu còn chỗ
  const momentsOnly = errors.filter((e) => e.tyLe != null).slice(0, limit);
  if (momentsOnly.length >= limit) return momentsOnly;
  const extras = errors.filter((e) => e.tyLe == null).slice(0, limit - momentsOnly.length);
  return [...momentsOnly, ...extras].slice(0, limit);
}

export function gscErrorsFromTopViolations(
  rows: TopViolationLike[] | null | undefined,
  limit = 5,
): ActionBoardErrorItem[] {
  return [...(rows ?? [])]
    .filter((r) => num(r.so_vi_pham) > 0)
    .sort((a, b) => num(b.so_vi_pham) - num(a.so_vi_pham) || a.ten_tieu_chi!.localeCompare(b.ten_tieu_chi ?? "", "vi"))
    .slice(0, limit)
    .map((r) => ({
      ten: String(r.ten_tieu_chi ?? "").trim() || "Tiêu chí",
      detail: [r.ma_bk, r.ten_bang_kiem].filter(Boolean).join(" · ") || undefined,
      count: num(r.so_vi_pham),
      tyLe: r.ty_le_vi_pham == null ? null : Number(r.ty_le_vi_pham),
    }));
}

export function buildActionBoardModel(input: {
  source: ActionBoardSource;
  matrixKhoa?: MatrixKhoaLike[] | null;
  moments?: MomentLike[] | null;
  topViolations?: TopViolationLike[] | null;
  vstKpis?: {
    loi_ky_thuat?: number | null;
    bo_sot?: number | null;
    tong_co_hoi?: number | null;
  } | null;
  limit?: number;
}): ActionBoardModel {
  const minSample = ACTION_BOARD_MIN_SAMPLE[input.source];
  const limit = input.limit ?? 5;
  const ranked = rankRowsFromMatrixKhoa(input.matrixKhoa, input.source);
  return {
    source: input.source,
    minSample,
    lowest: pickLowest(ranked, minSample, limit),
    highest: pickHighest(ranked, minSample, limit),
    errors:
      input.source === "vst"
        ? vstErrorsFromMoments(input.moments, input.vstKpis, limit)
        : gscErrorsFromTopViolations(input.topViolations, limit),
  };
}
