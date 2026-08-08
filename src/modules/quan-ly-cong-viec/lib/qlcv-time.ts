/** Chuẩn hoá giờ HH:mm (hoặc HH:mm:ss) → HH:mm; rỗng → null. */
export function normalizeTimeHHmm(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) throw new Error("Giờ không hợp lệ (dùng HH:mm).");
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error("Giờ ngoài khoảng 00:00–23:59.");
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Kết thúc phải sau bắt đầu khi cả hai có giá trị. */
export function assertQlcvTimeRange(
  gioBat: string | null | undefined,
  gioKet: string | null | undefined,
): void {
  if (!gioBat || !gioKet) return;
  if (gioKet <= gioBat) throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
}
