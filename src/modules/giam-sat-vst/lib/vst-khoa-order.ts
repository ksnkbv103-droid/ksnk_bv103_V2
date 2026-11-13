/**
 * VST-013a: dropdown khoa form VST — khoa lâm sàng (Khối Nội, Khối Ngoại) lên trước,
 * rồi Cận lâm sàng, Cơ quan, cuối cùng khoa chưa phân khối. Sort ổn định: trong cùng khối giữ thứ tự gốc.
 * Mặc định Claude 2026-11-13 (PO chưa chốt) — thứ tự theo mã `mdm_dm_khoi_khoa.ma_khoi`.
 */
const THU_TU_KHOI = ["KNOI", "KNGOAI", "KCLS", "KCOQUAN"];

export function sortKhoaLamSangTruoc<T extends { khoi_id?: string | null }>(
  khoas: T[],
  khoiRows: Array<{ id: string; ma: string }>,
): T[] {
  const rankById = new Map<string, number>();
  for (const k of khoiRows) {
    const idx = THU_TU_KHOI.indexOf(k.ma);
    if (idx >= 0) rankById.set(k.id, idx);
  }
  if (rankById.size === 0) return khoas;
  const rank = (k: T) => (k.khoi_id && rankById.has(k.khoi_id) ? rankById.get(k.khoi_id)! : THU_TU_KHOI.length);
  return khoas
    .map((k, i) => ({ k, i }))
    .sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i)
    .map((x) => x.k);
}
