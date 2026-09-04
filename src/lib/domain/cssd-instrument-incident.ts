/** Pure helpers — validation số lượng sự cố dụng cụ. */

/** Biến động số lượng / loại / thành phần khi vận hành — chỉ qua 3 cửa (D1/D2), không lẫn «sự cố an toàn». */
export const INSTRUMENT_CHANGE_REQUIRES_INCIDENT =
  "Biến động số lượng, loại hoặc thành phần dụng cụ chỉ ghi qua 3 cửa: Đổi danh mục · Hỏng/Mất · Chuyển. Mở /cssd-su-co (nhóm Dụng cụ).";

export function instrumentChangeRequiresIncidentResult() {
  return { success: false as const, error: INSTRUMENT_CHANGE_REQUIRES_INCIDENT };
}

/**
 * Hỏng/Mất không tách chi tiết khỏi bộ (không null bo_dung_cu_id).
 * Chuẩn BOM chỉ đổi qua phiếu đổi danh mục — helper giữ API, luôn false.
 */
export function shouldDetachChiTietFromSet(_quantity: number, _soLuongChiTiet: number): boolean {
  return false;
}

export function validateIssueQuantityAgainstThucTe(
  quantity: number,
  soLuongThucTe: number,
): string | null {
  const qty = Math.floor(Number(quantity) || 0);
  const thucTe = Math.max(0, Math.floor(Number(soLuongThucTe) || 0));
  if (qty <= 0) return "Số lượng phải lớn hơn 0.";
  if (qty > thucTe) return `Số lượng không được vượt quá số thực tế (${thucTe}).`;
  return null;
}

export function mapInstrumentPresetToLedgerType(
  typeId: string,
): "BAO_HONG" | "BAO_MAT" | "BO_SUNG" | "NHAP_KHO" | "DIEU_CHUYEN" | null {
  switch (typeId) {
    case "INSTRUMENT_BROKEN":
      return "BAO_HONG";
    case "INSTRUMENT_MISSING":
      return "BAO_MAT";
    case "INSTRUMENT_REPLENISH":
      return "BO_SUNG";
    case "INSTRUMENT_RETURN_KHO":
      return "NHAP_KHO";
    case "INSTRUMENT_TRANSFER":
      return "DIEU_CHUYEN";
    default:
      return null;
  }
}

/**
 * Pure formula mirror (QLDCPT) — **không** phải runtime SSOT đọc tồn.
 *
 * **Runtime SSOT tồn thực tế:** view `v_cssd_bo_dung_cu_chi_tiet_realtime.so_luong_thuc_te`
 * (dùng ở assertLedger / incident / kho). Helper này chỉ để doc + unit test công thức
 * «chuẩn − hỏng − mất + bổ sung ± DC» — **không** diverge / không thay view.
 *
 * Docs: docs/data/qldcpt/cssd-business-notes.md · domain-overview §6.
 */
export function computeSoLuongThucTeQldcpt(args: {
  soLuongChuan: number;
  soLuongHong?: number;
  soLuongMat?: number;
  soLuongBoSung?: number;
  /** Dương = vào bộ; âm = ra bộ. */
  soLuongDieuChuyenNet?: number;
}): number {
  const chuan = Math.max(0, Math.floor(Number(args.soLuongChuan) || 0));
  const hong = Math.max(0, Math.floor(Number(args.soLuongHong) || 0));
  const mat = Math.max(0, Math.floor(Number(args.soLuongMat) || 0));
  const boSung = Math.max(0, Math.floor(Number(args.soLuongBoSung) || 0));
  const dc = Math.floor(Number(args.soLuongDieuChuyenNet) || 0);
  return Math.max(0, chuan - hong - mat + boSung + dc);
}
