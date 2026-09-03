/** Pure helpers — validation số lượng sự cố dụng cụ. */

/** Biến động số lượng / loại / thành phần khi vận hành — chỉ sau phiếu sự cố. */
export const INSTRUMENT_CHANGE_REQUIRES_INCIDENT =
  "Biến động số lượng, loại hoặc thành phần dụng cụ chỉ được ghi qua báo cáo sự cố. Hãy mở phiếu Hỏng / Mất / Bổ sung.";

export function instrumentChangeRequiresIncidentResult() {
  return { success: false as const, error: INSTRUMENT_CHANGE_REQUIRES_INCIDENT };
}

export function shouldDetachChiTietFromSet(quantity: number, soLuongChiTiet: number): boolean {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const total = Math.max(1, Math.floor(Number(soLuongChiTiet) || 1));
  return qty >= total;
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
