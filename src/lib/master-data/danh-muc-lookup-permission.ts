/**
 * Kiểm quyền lookup danh mục — domain module + fallback DANH_MUC.view (role cũ).
 * DM-6: DANH_MUC.create/edit/delete/import không còn mở lookup đã tách.
 */
import { verifyAnyPermission } from "@/lib/server-permission";

const DEDICATED_NO_DANH_MUC_FALLBACK = new Set([
  "PHAN_QUYEN",
  "CONG_VIEC",
  "GIAM_SAT_NKBV",
  "NHAN_SU",
  "KHOA_PHONG",
  "BANG_KIEM",
  "BANG_KIEM_DETAIL",
]);

const SPLIT_LOOKUP_WRITE = new Set(["create", "edit", "delete", "import"]);

export function danhMucLookupPermissionCandidates(
  moduleKey: string,
  action: string,
): { moduleKey: string; action: string }[] {
  const key = moduleKey.trim();
  const act = action.trim();
  const actNorm = act.toLowerCase();
  const candidates = [{ moduleKey: key, action: act }];

  if (key !== "DANH_MUC" && key.startsWith("DANH_MUC_")) {
    if (!SPLIT_LOOKUP_WRITE.has(actNorm)) {
      candidates.push({ moduleKey: "DANH_MUC", action: act });
    }
    return candidates;
  }

  if (
    key !== "DANH_MUC" &&
    !DEDICATED_NO_DANH_MUC_FALLBACK.has(key) &&
    !key.startsWith("LOAI_") &&
    !key.startsWith("BO_") &&
    !key.startsWith("DC_") &&
    !key.startsWith("THIET_") &&
    !key.startsWith("HOA_")
  ) {
    candidates.push({ moduleKey: "DANH_MUC", action: act });
  }
  return candidates;
}

export async function verifyDanhMucLookupPermission(moduleKey: string, action: string): Promise<void> {
  await verifyAnyPermission(danhMucLookupPermissionCandidates(moduleKey, action));
}
