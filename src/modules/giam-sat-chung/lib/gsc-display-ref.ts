/**
 * Mã tra cứu hiển thị (Phiên GSC trong DB vẫn dùng UUID làm khóa chính).
 */
export function gscSessionDisplayRef(sessionId: string, ngayGiamSat?: string | null): string {
  const id = String(sessionId || "").replace(/-/g, "");
  const suffix = id.slice(0, 8).toUpperCase();
  const d = ngayGiamSat ? String(ngayGiamSat).slice(0, 10).replace(/-/g, "") : "";
  return d.length >= 8 ? `GSC-${d}-${suffix}` : `GSC-${suffix}`;
}

export function gscShortUuid(uuid: string | undefined): string {
  const u = String(uuid || "").replace(/-/g, "");
  return u ? u.slice(0, 8).toUpperCase() : "";
}
