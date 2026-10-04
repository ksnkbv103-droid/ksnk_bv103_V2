/**
 * Cổng nghiệm thu — chỉ đóng HOAN_THANH khi phiếu ở cổng chờ nghiệm thu.
 * Việc định kỳ không vào cổng này (tick đủ là đóng).
 * Quá hạn: hạn / cờ view — mã `QUA_HAN` chỉ là alias đang làm (nhãn), không phải cổng riêng.
 */

import { isQlcvLoaiDinhKy } from "./dinh-ky-auto-complete";
import { normalizeQlcvTrangThaiToCanonical } from "./trang-thai-canonical";

/** Ngày lịch VN — trùng `qlcvTodayVn` (tránh import module I/O; giữ domain thuần). */
function todayVn(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type QlcvNghiemThuGateInput = {
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
  loai_cong_viec?: string | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

function isHanHoanThanhDaQua(han: string | null | undefined): boolean {
  if (!han) return false;
  const s = String(han).trim();
  const h = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
  if (!h) return false;
  return h < todayVn();
}

/** Phiếu mở đang làm — kể cả quá hạn theo hạn/cờ; `QUA_HAN` = alias đang làm. */
function isPhieuMoDangLam(st: string, input: QlcvNghiemThuGateInput): boolean {
  if (st === "DANG_LAM" || st === "QUA_HAN") return true;
  return input.is_qua_han === true || isHanHoanThanhDaQua(input.han_hoan_thanh);
}

export function isEligibleForNghiemThu(input: QlcvNghiemThuGateInput): boolean {
  if (isQlcvLoaiDinhKy(input.loai_cong_viec)) return false;
  const st = normalizeQlcvTrangThaiToCanonical(input.trang_thai);
  // TU_CHOI = đã từ chối NT → «làm lại», không giữ cổng chờ nghiệm thu dù vẫn 100%/quá hạn.
  if (st === "HOAN_THANH" || st === "DA_HUY" || st === "TU_CHOI") return false;
  const pct = Number(input.phan_tram_hoan_thanh ?? 0);
  if (st === "CHO_DUYET") return true;
  if (pct < 100) return false;
  return isPhieuMoDangLam(st, input);
}
