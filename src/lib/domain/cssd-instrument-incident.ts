/** Pure helpers — validation số lượng sự cố dụng cụ. */

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

/** Dương = thiếu (lấy kho); âm = thừa (trả kho). Mốc: hệ thống vs chuẩn. */
export function lechVsChuan(soLuongChuan: number, soLuongThucTe: number): number {
  return Math.floor(Number(soLuongChuan) || 0) - Math.floor(Number(soLuongThucTe) || 0);
}

export function formatLechVsChuan(lech: number): string {
  if (lech > 0) return `Thiếu ${lech}`;
  if (lech < 0) return `Thừa ${-lech}`;
  return "Khớp chuẩn";
}

/** Cửa vận hành không được đụng định mức / mã gốc loại. */
export const INSTRUMENT_DOOR_BOM_MUTATION_KINDS = ["THEM_DONG", "XOA_DONG", "DOI_CHUAN"] as const;

export function doorKindFromIncidentType(typeId: string): string {
  switch (String(typeId || "").trim().toUpperCase()) {
    case "INSTRUMENT_BROKEN":
      return "HONG";
    case "INSTRUMENT_MISSING":
      return "MAT";
    case "INSTRUMENT_REPLENISH":
      return "LAY_KHO";
    case "INSTRUMENT_RETURN":
      return "TRA_KHO";
    case "INSTRUMENT_TRANSFER":
      return "BO_BO";
    case "INSTRUMENT_DOI_LOAI":
      return "DOI_LOAI";
    default:
      return String(typeId || "").trim().toUpperCase();
  }
}

export function doiLoaiIsCatalogRename(input: {
  mode?: string | null;
  newMaLoai?: string | null;
  newTenLoai?: string | null;
}): boolean {
  if (String(input.mode || "").trim().toUpperCase() === "CATALOG_RENAME") return true;
  if (String(input.newMaLoai || "").trim()) return true;
  if (String(input.newTenLoai || "").trim()) return true;
  return false;
}

export type InstrumentDoorLine = {
  kind: string;
  hasBomLine: boolean;
  doiLoai?: {
    currentLoaiDungCuId?: string | null;
    targetLoaiDungCuId?: string | null;
    newMaLoai?: string | null;
    newTenLoai?: string | null;
    mode?: string | null;
    catalogExists?: boolean;
  };
};

/** Khóa API cửa rà soát / sự cố dụng cụ — không chỉ ẩn nút. */
export function validateInstrumentDoorLines(lines: InstrumentDoorLine[]): string | null {
  for (const line of lines) {
    const kind = String(line.kind || "").trim().toUpperCase();
    if ((INSTRUMENT_DOOR_BOM_MUTATION_KINDS as readonly string[]).includes(kind)) {
      return "Cửa vận hành không thêm/xóa/đổi chuẩn dòng bộ. Sửa định mức ở Quản trị danh mục.";
    }
    if (kind === "DOI_LOAI") {
      const doi = line.doiLoai || {};
      if (doiLoaiIsCatalogRename(doi)) {
        return "Không đổi mã gốc loại dụng cụ từ cửa vận hành. Sửa loại ở Quản trị (thẻ Loại).";
      }
      const current = String(doi.currentLoaiDungCuId || "").trim();
      const target = String(doi.targetLoaiDungCuId || "").trim();
      if (!target) return "Báo sai mã: chọn loại đã có trong danh mục.";
      if (target === current) return "Loại đích trùng loại đang gắn trên dòng bộ.";
      if (doi.catalogExists === false) return "Chỉ gắn sang loại đã có trong danh mục — không tạo mã mới.";
      continue;
    }
    if (
      (kind === "LAY_KHO" || kind === "TRA_KHO" || kind === "BO_SUNG" || kind === "NHAP_KHO" || kind === "HONG" || kind === "MAT" || kind === "BO_BO") &&
      !line.hasBomLine
    ) {
      return "Chỉ thao tác trên loại đã có dòng chuẩn trên bộ. Thêm dòng định mức ở Quản trị.";
    }
  }
  return null;
}

export function suggestedLayKhoQty(
  soLuongChuan: number,
  soLuongThucTe: number,
  soLuongKho: number,
): number {
  const thieu = Math.max(0, lechVsChuan(soLuongChuan, soLuongThucTe));
  const kho = Math.max(0, Math.floor(Number(soLuongKho) || 0));
  return Math.min(thieu, kho);
}

export function suggestedTraKhoQty(soLuongChuan: number, soLuongThucTe: number): number {
  const thua = Math.max(0, -lechVsChuan(soLuongChuan, soLuongThucTe));
  const thuc = Math.max(0, Math.floor(Number(soLuongThucTe) || 0));
  return Math.min(thua, thuc);
}

export function validateLayKhoQty(
  quantity: number,
  soLuongChuan: number,
  soLuongThucTe: number,
  soLuongKho: number,
): string | null {
  const cap = suggestedLayKhoQty(soLuongChuan, soLuongThucTe, soLuongKho);
  if (cap < 1) {
    if (lechVsChuan(soLuongChuan, soLuongThucTe) <= 0) return "Loại này không thiếu so với chuẩn — không lấy kho.";
    return "Kho dự phòng không đủ để lấy.";
  }
  const qty = Math.floor(Number(quantity) || 0);
  if (qty < 1) return "Số lượng phải lớn hơn 0.";
  if (qty > cap) return `Chỉ được lấy tối đa ${cap} (thiếu so với chuẩn, không vượt tồn kho).`;
  return null;
}

export function validateTraKhoQty(
  quantity: number,
  soLuongChuan: number,
  soLuongThucTe: number,
): string | null {
  const cap = suggestedTraKhoQty(soLuongChuan, soLuongThucTe);
  if (cap < 1) return "Loại này không thừa so với chuẩn — không trả kho.";
  const qty = Math.floor(Number(quantity) || 0);
  if (qty < 1) return "Số lượng phải lớn hơn 0.";
  if (qty > cap) return `Chỉ được trả tối đa ${cap} (phần thừa so với chuẩn).`;
  return null;
}

export function mapInstrumentPresetToLedgerType(
  typeId: string,
): "BAO_HONG" | "BAO_MAT" | "BO_SUNG" | "DIEU_CHUYEN" | "NHAP_KHO" | null {
  switch (typeId) {
    case "INSTRUMENT_BROKEN":
      return "BAO_HONG";
    case "INSTRUMENT_MISSING":
      return "BAO_MAT";
    case "INSTRUMENT_REPLENISH":
      return "BO_SUNG";
    case "INSTRUMENT_RETURN":
      return "NHAP_KHO";
    case "INSTRUMENT_TRANSFER":
      return "DIEU_CHUYEN";
    default:
      return null;
  }
}
