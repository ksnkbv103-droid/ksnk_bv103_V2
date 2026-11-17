export const SUPERVISOR_NO_PROFILE_ERROR_VI =
  "Tài khoản của bạn chưa gắn hồ sơ nhân sự nên không thể ghi nhận phiên giám sát. Vui lòng liên hệ quản trị viên.";

/** VST-005: người giám sát khi lưu phiên. Không admin: luôn lấy từ tài khoản, bỏ giá trị client. */
export function resolveSupervisorIdForSave(input: {
  adminBypass: boolean;
  actorNhanSuId: string | null | undefined;
  clientNguoiGiamSatId: string | null | undefined;
}): string | null | undefined {
  const { adminBypass, actorNhanSuId, clientNguoiGiamSatId } = input;
  if (adminBypass) return clientNguoiGiamSatId || actorNhanSuId || clientNguoiGiamSatId;
  if (!actorNhanSuId) throw new Error(SUPERVISOR_NO_PROFILE_ERROR_VI);
  return actorNhanSuId;
}
