/**
 * Bộ được chọn khi báo sự cố — SSOT 2026-09-23 (file 17 §17 / 17c).
 * Chu trình mở = `cssd_fact_quy_trinh.is_active` (tiếp nhận mới đóng chu trình cũ).
 * Chưa sử dụng lâm sàng = chưa gắn ca mổ (`metadata.ma_ca_mo_id`).
 * Trạm = mã thật của chu trình mở. CHO_BI không phải mã trạm.
 */

export const SU_CO_OPEN_CYCLE_STATIONS = [
  "TIEP_NHAN",
  "LAM_SACH",
  "QC",
  "DONG_GOI",
  "TIET_KHUAN",
  "CAP_PHAT",
] as const;

export type SuCoOpenCycleStation = (typeof SU_CO_OPEN_CYCLE_STATIONS)[number];

const OPEN_CYCLE_STATION_SET = new Set<string>(SU_CO_OPEN_CYCLE_STATIONS);

const SET_CODE_RE = /^[A-Z0-9][A-Z0-9._:-]{0,80}$/;

export const SU_CO_SET_PICKER_EMPTY =
  "Không có bộ đang trong chu trình xử lý. Bộ đã sử dụng tại khoa, chu trình đã đóng, hoặc chỉ có trong danh mục — không chọn được.";

export type SuCoOpenCycleInput = {
  /** false = chu trình đã đóng bởi tiếp nhận mới. */
  isActive: boolean;
  /** `cssd_dm_tram.ma_tram` / `ma_trang_thai_hien_tai`. */
  stationCode: string | null | undefined;
  /** Ca mổ / bệnh nhân — sự kiện đã sử dụng tại khoa hoặc phòng mổ. */
  maCaMoId: string | null | undefined;
};

export function normalizeSuCoSetCode(raw: string | null | undefined): string {
  return String(raw || "").trim().toUpperCase();
}

export function isSafeSuCoSetCode(code: string): boolean {
  return SET_CODE_RE.test(code);
}

export function hasClinicalUse(maCaMoId: string | null | undefined): boolean {
  return normalizeSuCoSetCode(maCaMoId).length > 0;
}

export function isSuCoOpenCycleStation(code: string | null | undefined): code is SuCoOpenCycleStation {
  return OPEN_CYCLE_STATION_SET.has(normalizeSuCoSetCode(code));
}

/** Cả bốn điều kiện IN: mở, chưa dùng lâm sàng, chưa đóng bởi tiếp nhận mới, trạm trong vòng xử lý. */
export function isOpenCycleEligibleForSuCo(input: SuCoOpenCycleInput): boolean {
  if (!input.isActive) return false;
  if (hasClinicalUse(input.maCaMoId)) return false;
  return isSuCoOpenCycleStation(input.stationCode);
}

export function explainSuCoSetOut(input: SuCoOpenCycleInput): string {
  if (!input.isActive) {
    return "Bộ này đã đóng chu trình (đã có tiếp nhận mới). Chỉ báo sự cố trên chu trình đang mở.";
  }
  if (hasClinicalUse(input.maCaMoId)) {
    return "Bộ này đã sử dụng tại khoa hoặc phòng mổ (đã gắn ca mổ). Không chọn để báo sự cố trong chu trình xử lý.";
  }
  if (!normalizeSuCoSetCode(input.stationCode)) {
    return "Bộ này chỉ có trong danh mục, chưa có chu trình đang mở.";
  }
  return "Bộ này không ở trạm đang xử lý (tiếp nhận, làm sạch, QC, đóng gói, tiệt khuẩn, cấp phát).";
}

export function toSuCoOpenCycleInput(row: {
  is_active?: boolean | null;
  ma_trang_thai_hien_tai?: string | null;
  ma_ca_mo_id?: string | null;
}): SuCoOpenCycleInput {
  return {
    isActive: row.is_active !== false,
    stationCode: row.ma_trang_thai_hien_tai,
    maCaMoId: row.ma_ca_mo_id,
  };
}
