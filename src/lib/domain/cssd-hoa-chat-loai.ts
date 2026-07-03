/** Phân loại danh mục — hóa chất tiệt trùng vs vật tư tiêu hao. */

export type HoaChatLoaiMa = "HOA_CHAT" | "VAT_TU" | "TEST";

export type HoaChatLoaiFilter = "ALL" | "HOA_CHAT" | "VAT_TU";

export function normalizeLoaiHoaChat(raw: string | null | undefined): HoaChatLoaiMa {
  const v = String(raw || "HOA_CHAT").trim().toUpperCase();
  if (v === "VAT_TU" || v === "TEST") return v;
  return "HOA_CHAT";
}

export function loaiHoaChatLabel(raw: string | null | undefined): string {
  const v = normalizeLoaiHoaChat(raw);
  if (v === "VAT_TU") return "Vật tư tiêu hao";
  if (v === "TEST") return "Chỉ thị / test";
  return "Hóa chất tiệt trùng";
}

export function isHoaChatLoai(raw: string | null | undefined): boolean {
  return normalizeLoaiHoaChat(raw) === "HOA_CHAT";
}

export function isVatTuLoai(raw: string | null | undefined): boolean {
  const v = normalizeLoaiHoaChat(raw);
  return v === "VAT_TU" || v === "TEST";
}

export function matchesLoaiFilter(loai: string | null | undefined, filter: HoaChatLoaiFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "HOA_CHAT") return isHoaChatLoai(loai);
  return isVatTuLoai(loai);
}
