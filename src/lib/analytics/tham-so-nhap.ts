import { THAM_SO_MAC_DINH, type MaThamSo } from "./supervision-thresholds";

export type ThamSoNhap = { maThamSo: string; giaTri: unknown; hieuLucTu: string; nguon: string };
export type ThamSoHopLe = { ma_tham_so: MaThamSo; gia_tri: number; hieu_luc_tu: string; nguon: string };

export const THAM_SO_NGUON_MIN_CHARS = 5;

/**
 * Kiểm một dòng tham số trước khi thêm. Bảng chỉ thêm dòng (không sửa/xóa) nên
 * ngày hiệu lực không được lùi trước `homNay`: số liệu kỳ đã qua giữ nguyên ngưỡng cũ.
 */
export function kiemThamSoNhap(
  input: ThamSoNhap,
  homNay: string,
): { ok: true; row: ThamSoHopLe } | { ok: false; error: string } {
  const ma = String(input.maThamSo || "").trim();
  if (!(ma in THAM_SO_MAC_DINH)) return { ok: false, error: "Mã tham số không có trong danh sách." };
  const raw = typeof input.giaTri === "string" ? input.giaTri.trim() : input.giaTri;
  const v = raw === "" || raw == null ? NaN : Number(raw);
  if (!Number.isFinite(v)) return { ok: false, error: "Giá trị phải là số." };
  if (ma.endsWith("_pct")) {
    if (v < 0 || v > 100) return { ok: false, error: "Ngưỡng % phải nằm trong 0–100." };
  } else if (!Number.isInteger(v) || v < 1) {
    return { ok: false, error: "Cỡ mẫu tối thiểu phải là số nguyên từ 1." };
  }
  const ngay = String(input.hieuLucTu || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || Number.isNaN(Date.parse(ngay))) {
    return { ok: false, error: "Ngày hiệu lực không hợp lệ." };
  }
  if (ngay < homNay) return { ok: false, error: "Ngày hiệu lực không được trước hôm nay." };
  const nguon = String(input.nguon || "").trim();
  if (nguon.length < THAM_SO_NGUON_MIN_CHARS) {
    return { ok: false, error: `Ghi nguồn/căn cứ (tối thiểu ${THAM_SO_NGUON_MIN_CHARS} ký tự).` };
  }
  return { ok: true, row: { ma_tham_so: ma as MaThamSo, gia_tri: v, hieu_luc_tu: ngay, nguon } };
}
