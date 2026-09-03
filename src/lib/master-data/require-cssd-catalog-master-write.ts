import { assertCssdCatalogMasterWriteAllowed } from "@/lib/domain/cssd-catalog-master-write";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";

/** Form MDM loại/bộ/thành phần: chỉ ADMIN (full grant). Duyệt phiếu vẫn dùng BO_DC.edit. */
export async function requireCssdCatalogMasterWrite(): Promise<void> {
  assertCssdCatalogMasterWriteAllowed(await hasRBACAdminSupervisionBypass());
}
