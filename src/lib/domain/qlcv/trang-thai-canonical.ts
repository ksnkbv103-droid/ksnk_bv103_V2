/**
 * SSOT mã trạng thái QLCV Track B — khớp CHECK DB (migration 20260709140000).
 * Alias legacy chỉ để đọc dữ liệu cũ / UI; ghi mới luôn canonical.
 */

export const QLCV_CANONICAL_TRANG_THAI = [
  "MOI",
  "DANG_LAM",
  "CHO_DUYET",
  "HOAN_THANH",
  "TU_CHOI",
  "QUA_HAN",
  "DA_HUY",
] as const;

export type QlcvCanonicalTrangThai = (typeof QLCV_CANONICAL_TRANG_THAI)[number];

const CANONICAL_SET = new Set<string>(QLCV_CANONICAL_TRANG_THAI);

/** Alias → mã canonical (domain-specification §2.3). */
const LEGACY_ALIAS_TO_CANONICAL: Record<string, QlcvCanonicalTrangThai> = {
  CHUA_BAT_DAU: "MOI",
  CHO_NHAN_VIEC: "DANG_LAM",
  DANG_THUC_HIEN: "DANG_LAM",
  CHO_XAC_NHAN_HOAN_THANH: "CHO_DUYET",
};

export function isQlcvCanonicalTrangThai(code: string | null | undefined): boolean {
  return CANONICAL_SET.has(String(code || "").trim().toUpperCase());
}

/**
 * Chuẩn hóa mã trạng thái khi đọc/ghi.
 * Alias legacy → 7 mã canonical; chuỗi rỗng → MOI; mã lạ giữ nguyên (CHECK DB sẽ chặn khi ghi).
 */
export function normalizeQlcvTrangThaiToCanonical(raw: string | null | undefined): string {
  const st = String(raw || "").trim().toUpperCase();
  if (!st) return "MOI";
  const mapped = LEGACY_ALIAS_TO_CANONICAL[st];
  if (mapped) return mapped;
  return st;
}
