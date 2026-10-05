/** Ghi chú mẻ tiệt khuẩn — tương thích parse in phiếu. */
export function formatMeNguoiNapGhiChu(hoTen: string, nhanSuId: string): string {
  const name = String(hoTen || "").trim();
  const id = String(nhanSuId || "").trim();
  if (!name) return "";
  if (!id) return `Người load: ${name}`;
  return `Người load: ${name} | nguoi_nap_id:${id}`;
}

export function parseNguoiNapIdFromGhiChu(ghiChu: string | null | undefined): string | null {
  const m = String(ghiChu || "").match(/nguoi_nap_id:([0-9a-f-]{36})/i);
  return m?.[1]?.trim() || null;
}
