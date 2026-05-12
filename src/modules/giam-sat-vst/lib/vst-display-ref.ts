/**
 * Mã tra cứu “đọc được” hiển thị trên UI / phiếu in / export.
 * Khóa UUID trong database không đổi — cột hiển thị giúp ghi nhận và phân tích thân thiện hơn.
 */
export function vstSessionDisplayRef(sessionId: string, ngayGiamSat?: string | null): string {
  const id = String(sessionId || "").replace(/-/g, "");
  const suffix = id.slice(0, 8).toUpperCase();
  const d = ngayGiamSat ? String(ngayGiamSat).slice(0, 10).replace(/-/g, "") : "";
  return d.length >= 8 ? `VST-${d}-${suffix}` : `VST-${suffix}`;
}

/** Rút UUID xuống 8 ký tự HEX (nhận dạng nhanh, không nhầm là mã hoàn chỉnh). */
export function vstShortUuid(uuid: string | undefined): string {
  const u = String(uuid || "").replace(/-/g, "");
  return u ? u.slice(0, 8).toUpperCase() : "";
}
