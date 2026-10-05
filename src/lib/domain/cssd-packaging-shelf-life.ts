// ME-05 — HSD sau tiệt khuẩn theo loại bao gói (không default 30 ngày).

/** Chuẩn hóa số ngày từ cấu hình danh mục; thiếu/không hợp lệ → null. */
export function resolvePackagingShelfDays(
  soNgayHanDung: number | null | undefined,
): number | null {
  if (soNgayHanDung == null || !Number.isFinite(soNgayHanDung)) return null;
  const n = Math.trunc(soNgayHanDung);
  return n > 0 ? n : null;
}

/** Cộng ngày vào mốc kết thúc chu trình (ISO); thiếu mốc hoặc ngày → null. */
export function computeHanSuDungFromMoc(
  mocIso: string | null | undefined,
  shelfDays: number | null | undefined,
): string | null {
  const days = resolvePackagingShelfDays(shelfDays);
  if (!mocIso || days == null) return null;
  const d = new Date(mocIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
