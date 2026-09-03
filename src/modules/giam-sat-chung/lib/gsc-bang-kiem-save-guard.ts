/**
 * BK-5: mẫu tắt / không còn áp dụng khoa — không dùng cho phiếu mới hoặc khi đổi mẫu.
 * Sửa phiếu cũ cùng mẫu: không chặn.
 */

export const GSC_BK_INACTIVE_NEW_SESSION =
  "Mẫu bảng kiểm đã tắt. Không tạo phiếu mới trên mẫu này. Phiếu cũ vẫn mở và sửa được.";

export const GSC_BK_NOT_AP_DUNG_KHOA =
  "Mẫu này không áp dụng cho khoa của bạn. Không tạo phiếu mới trên mẫu này.";

/** Đổi sang mẫu khác khi sửa (biết được mã mẫu cũ). Phiếu cũ không rõ mã → không coi là đổi. */
export function gscIsBangKiemSwitch(previousId: unknown, nextId: string): boolean {
  const prev = String(previousId ?? "").trim();
  const next = String(nextId ?? "").trim();
  if (!prev || !next) return false;
  return prev !== next;
}

export function assertGscBangKiemForNewOrSwitch(opts: {
  isActive: boolean;
  mangLuoiRestricted: boolean;
  apDungChoKhoa: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!opts.isActive) {
    return { ok: false, error: GSC_BK_INACTIVE_NEW_SESSION };
  }
  if (opts.mangLuoiRestricted && !opts.apDungChoKhoa) {
    return { ok: false, error: GSC_BK_NOT_AP_DUNG_KHOA };
  }
  return { ok: true };
}
