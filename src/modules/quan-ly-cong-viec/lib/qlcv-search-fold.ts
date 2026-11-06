/** Chuẩn hóa chuỗi để tìm không dấu, không phân biệt hoa thường (thuần, không I/O). */
export function foldQlcvSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Khớp khi mọi từ khóa (tách theo khoảng trắng) xuất hiện trong ít nhất một trường. */
export function matchesQlcvSearch(fields: unknown[], term: string): boolean {
  const words = foldQlcvSearch(term).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.map(foldQlcvSearch).join(" ");
  return words.every((w) => hay.includes(w));
}

/**
 * Mẫu tìm cho ilike phía server (DB chưa có unaccent): từ khóa không dấu thì thay nguyên âm và «d»
 * bằng `_` để khớp cả ký tự có dấu; từ khóa đã có dấu giữ nguyên.
 */
export function qlcvServerSearchTerm(term: string): string {
  const t = term.trim();
  if (!t || foldQlcvSearch(t) !== t.toLowerCase()) return t;
  return t.replace(/[aeiouyd]/gi, "_");
}
