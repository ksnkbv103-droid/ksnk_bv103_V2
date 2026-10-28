/** Nhóm con hóa chất / vật tư — logic thuần (sinh mã, lọc theo loại). */

export type NhomLoai = "HOA_CHAT" | "VAT_TU";

export type NhomLike = { loai_hoa_chat: string; is_active?: boolean };

/** Sinh mã nhóm: bỏ dấu, upper, ký tự lạ → `_`, tối đa 50 ký tự (khớp CHECK DB). */
export function sinhMaNhom(ten: string): string {
  const ma = String(ten || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50)
    .replace(/_+$/g, "");
  return ma || "NHOM";
}

/** Chống trùng mã: thêm hậu tố _2, _3… cho tới khi không có trong `existing`. */
export function maNhomKhongTrung(base: string, existing: Iterable<string>): string {
  const used = new Set(Array.from(existing, (m) => m.toUpperCase()));
  if (!used.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const suffix = `_${i}`;
    const cand = `${base.slice(0, 50 - suffix.length)}${suffix}`;
    if (!used.has(cand)) return cand;
  }
  return `${base.slice(0, 40)}_${Date.now() % 1e9}`;
}

/** Lọc nhóm theo loại; mặc định chỉ lấy nhóm đang dùng. */
export function locNhomTheoLoai<T extends NhomLike>(nhoms: readonly T[], loai: string, opts?: { gomNgung?: boolean }): T[] {
  return nhoms.filter((n) => n.loai_hoa_chat === loai && (opts?.gomNgung || n.is_active !== false));
}
