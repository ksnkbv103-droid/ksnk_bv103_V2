import { verifyAnyPermission, verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";

/** Phê duyệt đề xuất / nghiệm thu — `approve` hoặc tương thích `edit`. */
export async function verifyQlcvApproveCapability(): Promise<void> {
  await verifyAnyPermission([
    { moduleKey: "CONG_VIEC", action: "approve" },
    { moduleKey: "CONG_VIEC", action: "edit" },
  ]);
}

/** Nghiệm thu hoàn thành / từ chối khi chờ duyệt xong. */
export async function verifyQlcvNghiemThuCapability(): Promise<void> {
  await verifyQlcvApproveCapability();
}

/** Xóa hoặc hủy cứng — `delete`, hoặc quản trị giám sát. */
export async function verifyQlcvDeleteCapability(): Promise<void> {
  if (await hasRBACAdminSupervisionBypass()) return;
  await verifyPermission("CONG_VIEC", "delete");
}
