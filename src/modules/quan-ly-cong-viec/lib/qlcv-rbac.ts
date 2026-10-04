import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";

/** Phê duyệt đề xuất — chỉ `approve` (QLCV-06: không suy từ edit). */
export async function verifyQlcvApproveCapability(): Promise<void> {
  await verifyPermission("CONG_VIEC", "approve");
}

/** Nghiệm thu hoàn thành / từ chối — chỉ `approve`. */
export async function verifyQlcvNghiemThuCapability(): Promise<void> {
  await verifyPermission("CONG_VIEC", "approve");
}

/** Xóa hoặc hủy cứng — `delete`, hoặc quản trị giám sát. */
export async function verifyQlcvDeleteCapability(): Promise<void> {
  if (await hasRBACAdminSupervisionBypass()) return;
  await verifyPermission("CONG_VIEC", "delete");
}

/** Quản trị chỉnh trạng thái qua transition (có lý do). */
export async function verifyQlcvAdminStatusCapability(): Promise<void> {
  if (await hasRBACAdminSupervisionBypass()) return;
  throw new Error("Chỉ quản trị được chỉnh trạng thái trực tiếp.");
}
