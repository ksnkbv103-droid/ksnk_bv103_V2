export const SUPERVISOR_NO_PROFILE_ERROR_VI =
  "Tài khoản của bạn chưa gắn hồ sơ nhân sự nên không thể ghi nhận phiên giám sát. Vui lòng liên hệ quản trị viên.";

/** VST-005: người giám sát khi lưu phiên. Không admin: luôn lấy từ tài khoản, bỏ giá trị client. */
export function resolveSupervisorIdForSave(input: {
  adminBypass: boolean;
  actorNhanSuId: string | null | undefined;
  clientNguoiGiamSatId: string | null | undefined;
  /** VST-027: chủ phiên gốc khi sửa phiên đã có. */
  chuPhienGoc?: string | null;
  /** VST-027: CB_KSNK sửa phiên người khác giữ chủ phiên gốc, không đổi sang người gửi. */
  laCanBoKsnk?: boolean;
}): string | null | undefined {
  const { adminBypass, actorNhanSuId, clientNguoiGiamSatId, chuPhienGoc, laCanBoKsnk } = input;
  if (adminBypass) return clientNguoiGiamSatId || actorNhanSuId || clientNguoiGiamSatId;
  if (!actorNhanSuId) throw new Error(SUPERVISOR_NO_PROFILE_ERROR_VI);
  if (laCanBoKsnk && chuPhienGoc) return chuPhienGoc;
  return actorNhanSuId;
}
