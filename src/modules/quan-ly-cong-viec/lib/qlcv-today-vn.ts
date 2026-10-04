/**
 * «Hôm nay» theo Asia/Ho_Chi_Minh — khớp SQL `fn_qlcv_today_vn()` và spawn định kỳ.
 */

const VN_TZ = "Asia/Ho_Chi_Minh";

const vnDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ngày lịch VN YYYY-MM-DD tại thời điểm `now` (mặc định máy). */
export function qlcvTodayVn(now: Date = new Date()): string {
  return vnDateFmt.format(now);
}

/**
 * Ngày lịch VN từ timestamptz / Date.
 * Chuỗi chỉ ngày (`YYYY-MM-DD`) giữ nguyên (hạn người dùng nhập).
 */
export function qlcvDateVnFromInstant(raw: string | Date | null | undefined): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s.length >= 10 ? s.slice(0, 10) : "";
    return vnDateFmt.format(d);
  }
  if (Number.isNaN(raw.getTime())) return "";
  return vnDateFmt.format(raw);
}

/** Hạn (date-only) đã qua so với hôm nay VN. */
export function isQlcvHanPastVn(
  han: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const h = qlcvDateVnFromInstant(han);
  if (!h) return false;
  return h < qlcvTodayVn(now);
}
