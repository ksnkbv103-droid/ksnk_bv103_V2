/**
 * Kiểm quyền lookup danh mục — domain module + fallback DANH_MUC (tương thích role cũ).
 */
import { verifyAnyPermission } from "@/lib/server-permission";

export async function verifyDanhMucLookupPermission(moduleKey: string, action: string): Promise<void> {
  const candidates = [{ moduleKey, action }];
  if (moduleKey !== "DANH_MUC" && moduleKey.startsWith("DANH_MUC_")) {
    candidates.push({ moduleKey: "DANH_MUC", action });
  } else if (
    moduleKey !== "DANH_MUC" &&
    !["PHAN_QUYEN", "CONG_VIEC", "GIAM_SAT_NKBV", "NHAN_SU", "KHOA_PHONG", "BANG_KIEM", "BANG_KIEM_DETAIL"].includes(
      moduleKey,
    ) &&
    !moduleKey.startsWith("LOAI_") &&
    !moduleKey.startsWith("BO_") &&
    !moduleKey.startsWith("DC_") &&
    !moduleKey.startsWith("THIET_") &&
    !moduleKey.startsWith("HOA_")
  ) {
    candidates.push({ moduleKey: "DANH_MUC", action });
  }
  await verifyAnyPermission(candidates);
}
