/**
 * Kiểm quyền lookup danh mục theo khóa module sở hữu.
 * AR-8h (PO 2026-11-11): bỏ khóa DANH_MUC / DANH_MUC_GSTT / DANH_MUC_CSSD_LOOKUP — không còn fallback.
 * Lookup trong module nghiệp vụ (GSC, CSSD, NKBV): xem theo quyền xem module, ghi chỉ ADMIN.
 */
import { isAdminOnlyLookupWrite } from "@/lib/master-data/master-table-permission-map";
import { verifyAdminRole, verifyAnyPermission } from "@/lib/server-permission";

export function danhMucLookupPermissionCandidates(
  moduleKey: string,
  action: string,
): { moduleKey: string; action: string }[] {
  return [{ moduleKey: moduleKey.trim(), action: action.trim() }];
}

export async function verifyDanhMucLookupPermission(moduleKey: string, action: string): Promise<void> {
  if (isAdminOnlyLookupWrite(moduleKey, action)) {
    await verifyAdminRole("Chỉ ADMIN được sửa danh mục tra cứu.");
    return;
  }
  await verifyAnyPermission(danhMucLookupPermissionCandidates(moduleKey, action));
}
