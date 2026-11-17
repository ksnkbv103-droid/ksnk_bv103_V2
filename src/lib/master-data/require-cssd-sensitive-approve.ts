import { sensitiveChangeDeniedMessage } from "@/lib/domain/cssd-sensitive-change";
import { verifyPermission } from "@/lib/server-permission";

/** AR-5d: thay đổi nhạy cảm cần quyền `approve` (ADMIN / break-glass tự qua trong verifyPermission). */
export async function requireCssdSensitiveApprove(
  moduleKey: "HOA_CHAT" | "THIET_BI",
  reasons: string[],
): Promise<void> {
  if (!reasons.length) return;
  try {
    await verifyPermission(moduleKey, "approve");
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Bạn chưa đăng nhập.") throw e;
    throw new Error(sensitiveChangeDeniedMessage(reasons));
  }
}
