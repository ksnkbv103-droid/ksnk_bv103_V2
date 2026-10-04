/**
 * GSC-04 / N-GSC-5 — suy doi_tuong_giam_sat theo chủ đề BK (không cứng NHAN_VIEN).
 * Domain duyệt sau; mặc định tạm theo Lead 2026-10-05.
 */

export type GscDoiTuongGiamSat =
  | "NHAN_VIEN"
  | "NGUOI_BENH"
  | "MOI_TRUONG"
  | "THIET_BI"
  | "ME_TIET_KHUAN";

/** Bundle NB / gói phòng ngừa (QT.29–32 và short tương đương). */
const NGUOI_BENH_RE =
  /\b(QT\.29|QT\.30|QT\.31|QT\.32|BM\.24|BM\.25|BM\.26|BM\.27)\b|SSI|CLABSI|CAUTI|VAP|bundle/i;

const MOI_TRUONG_RE =
  /VSMT|vệ sinh môi trường|đồ vải|đồ vải\b|QT\.11|BM\.11|QT\.13|BM\.13|phòng sạch|AIIR|BM\.QĐ\.08/i;

const ME_TIET_KHUAN_RE = /mẻ|tiệt khuẩn|BI\b|QT\.23|QT\.21|BM\.22/i;

const THIET_BI_RE =
  /CSSD|dụng cụ|đóng gói|lưu trữ|cấp phát|KKMĐC|MEC|QT\.1[89]|QT\.2[0-8]|BM\.1[89]|BM\.2[0-2]|THIET_BI|thiết bị/i;

export function inferDoiTuongGiamSatFromTopic(input: {
  ma_bk?: string | null;
  ten_bang_kiem?: string | null;
  chuyen_de?: string | null;
  mo_ta?: string | null;
}): GscDoiTuongGiamSat {
  const hay = [input.ma_bk, input.ten_bang_kiem, input.chuyen_de, input.mo_ta]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" | ");
  if (!hay) return "NHAN_VIEN";
  if (NGUOI_BENH_RE.test(hay)) return "NGUOI_BENH";
  if (MOI_TRUONG_RE.test(hay)) return "MOI_TRUONG";
  if (ME_TIET_KHUAN_RE.test(hay)) return "ME_TIET_KHUAN";
  if (THIET_BI_RE.test(hay)) return "THIET_BI";
  return "NHAN_VIEN";
}
