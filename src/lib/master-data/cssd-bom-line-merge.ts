/**
 * BOM chi tiết: 1 bộ × 1 loại active = 1 dòng; so_luong = tổng.
 * Pure helpers — no Supabase.
 */

export type BomLineForMerge = {
  id: string;
  loai_dung_cu_id: string | null;
  so_luong: number | null;
  created_at?: string | null;
  is_active?: boolean | null;
  ten_dung_cu_le?: string | null;
  ten_chi_tiet?: string | null;
};

export type BomLineMergeGroup = {
  loaiId: string;
  keepId: string;
  totalQty: number;
  dropIds: string[];
};

function qtyOf(line: BomLineForMerge): number {
  const n = Math.floor(Number(line.so_luong) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Prefer largest so_luong, then oldest created_at, then stable id. */
export function pickKeepBomLine(lines: BomLineForMerge[]): BomLineForMerge {
  if (lines.length === 0) throw new Error("pickKeepBomLine: empty");
  return [...lines].sort((a, b) => {
    const dq = qtyOf(b) - qtyOf(a);
    if (dq !== 0) return dq;
    const ca = String(a.created_at || "");
    const cb = String(b.created_at || "");
    if (ca && cb && ca !== cb) return ca < cb ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  })[0]!;
}

/**
 * Group active-ish lines by loai_dung_cu_id.
 * Skips null/empty loai (caller may note them).
 * keepId prefers largest so_luong then oldest created.
 */
export function groupBomLinesByLoai(lines: BomLineForMerge[]): Map<string, BomLineMergeGroup> {
  const byLoai = new Map<string, BomLineForMerge[]>();
  for (const line of lines) {
    if (line.is_active === false) continue;
    const loaiId = String(line.loai_dung_cu_id || "").trim();
    if (!loaiId) continue;
    const bucket = byLoai.get(loaiId) || [];
    bucket.push(line);
    byLoai.set(loaiId, bucket);
  }

  const out = new Map<string, BomLineMergeGroup>();
  for (const [loaiId, bucket] of byLoai) {
    const keep = pickKeepBomLine(bucket);
    const totalQty = bucket.reduce((sum, l) => sum + qtyOf(l), 0);
    const dropIds = bucket.filter((l) => l.id !== keep.id).map((l) => l.id);
    out.set(loaiId, { loaiId, keepId: keep.id, totalQty, dropIds });
  }
  return out;
}

/** Groups that actually need merge (dropIds non-empty). */
export function mergeDuplicateBomLinePlan(lines: BomLineForMerge[]): BomLineMergeGroup[] {
  return [...groupBomLinesByLoai(lines).values()].filter((g) => g.dropIds.length > 0);
}

/** THEM_DONG / form create: add onto existing active qty. */
export function planAddOntoExistingQty(existingSoLuong: number | null | undefined, addQty: number): number {
  const base = Math.max(0, Math.floor(Number(existingSoLuong) || 0));
  const add = Math.max(1, Math.floor(Number(addQty) || 1));
  return base + add;
}

export type MergeDuplicateBomResult = {
  mergedGroups: number;
  rowsSoftDeleted: number;
  skippedNullLoai: number;
  note?: string;
};
