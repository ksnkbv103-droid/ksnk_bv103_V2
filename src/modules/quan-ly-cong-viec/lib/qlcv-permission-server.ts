"use server";

import { verifyAnyPermission } from "@/lib/server-permission";

/** Cấp trên / người có quyền duyệt đề xuất & nghiệm thu (edit hoặc approve). */
export async function verifyCongViecApprovePermission(): Promise<void> {
  await verifyAnyPermission([
    { moduleKey: "CONG_VIEC", action: "edit" },
    { moduleKey: "CONG_VIEC", action: "approve" },
    { moduleKey: "CONG_VIEC", action: "APPROVE" },
  ]);
}

export async function hasCongViecApprovePermission(): Promise<boolean> {
  try {
    await verifyCongViecApprovePermission();
    return true;
  } catch {
    return false;
  }
}
