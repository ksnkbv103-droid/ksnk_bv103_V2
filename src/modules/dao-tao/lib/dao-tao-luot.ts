/** Cách đếm lượt thi DUY NHẤT của module Đào tạo (thi thật, theo người + cấu hình). */

/** Lượt đã nộp (kể cả nộp khi hết giờ) — dùng hiển thị và thống kê phủ kỳ thi. */
export const TRANG_THAI_DA_NOP = ["da_nop", "het_gio"] as const;
/** Lượt đang chiếm chỗ: đã nộp + đang làm dở (bắt đầu thi là tiêu một lượt). */
export const TRANG_THAI_TIEU_LUOT = ["da_nop", "het_gio", "dang_lam"] as const;

export type LuotRow = { id?: string; trang_thai: string };

export type LuotSummary = { daNop: number; tieuLuot: number; conLuot: boolean; soLanChoPhep: number };

export function normalizeSoLan(soLanChoPhep: number | null | undefined): number {
  return soLanChoPhep != null && soLanChoPhep >= 1 ? soLanChoPhep : 1;
}

export function summarizeLuot(rows: LuotRow[], soLanChoPhep: number | null | undefined): LuotSummary {
  const soLan = normalizeSoLan(soLanChoPhep);
  const daNop = rows.filter((r) => (TRANG_THAI_DA_NOP as readonly string[]).includes(r.trang_thai)).length;
  const tieuLuot = rows.filter((r) => (TRANG_THAI_TIEU_LUOT as readonly string[]).includes(r.trang_thai)).length;
  return { daNop, tieuLuot, conLuot: tieuLuot < soLan, soLanChoPhep: soLan };
}

/**
 * Sau khi insert: lần thi của mình có nằm trong `soLan` lần đầu (bat_dau_luc, id) không?
 * Thứ tự xác định nên khi race, đúng `soLan` lần giữ lại, phần còn lại bị thu hồi.
 */
export function isWithinLuot(
  rows: Array<{ id: string; bat_dau_luc: string; trang_thai: string }>,
  myId: string,
  soLanChoPhep: number | null | undefined,
): boolean {
  const soLan = normalizeSoLan(soLanChoPhep);
  const ids = rows
    .filter((r) => (TRANG_THAI_TIEU_LUOT as readonly string[]).includes(r.trang_thai))
    .sort((a, b) => (a.bat_dau_luc === b.bat_dau_luc ? a.id.localeCompare(b.id) : a.bat_dau_luc.localeCompare(b.bat_dau_luc)))
    .slice(0, soLan)
    .map((r) => r.id);
  return ids.includes(myId);
}
