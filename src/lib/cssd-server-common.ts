import { revalidatePath } from "next/cache";
import { CSSD_ROUTES } from "./cssd-routes";

export function safeRevalidateCssdPath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    /* ngoài request context */
  }
}

function revalidateMany(paths: readonly string[]) {
  const seen = new Set<string>();
  for (const p of paths) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    safeRevalidateCssdPath(p);
  }
}

/** Sau quét trạm / lệnh workflow. */
export function revalidateCssdWorkflowSurfaces() {
  revalidateMany([
    CSSD_ROUTES.quyTrinh,
    CSSD_ROUTES.erpRoot,
    "/cssd-tiep-nhan",
    "/cssd-dong-goi",
    "/cssd-cap-phat",
  ]);
}

/** Sau thao tác mẻ tiệt khuẩn. */
export function revalidateCssdBatchSurfaces() {
  revalidateMany([CSSD_ROUTES.quyTrinh, CSSD_ROUTES.erpBatch, "/cssd-erp/batch", CSSD_ROUTES.thietBi]);
}

/** Sau đăng ký nhãn / kho FEFO / import. */
export function revalidateCssdInventorySurfaces() {
  revalidateMany([
    CSSD_ROUTES.dungCu,
    CSSD_ROUTES.quyTrinh,
    CSSD_ROUTES.erpInventory,
    "/cssd-quan-tri",
    "/cssd-erp/inventory",
  ]);
}

/** Sau nhập/xuất hóa chất. */
export function revalidateCssdChemicalSurfaces() {
  revalidateMany([CSSD_ROUTES.hoaChat, "/cssd-erp/kho-hoa-chat"]);
}

/** Sau bảo trì thiết bị. */
export function revalidateCssdMaintenanceSurfaces() {
  revalidateCssdBatchSurfaces();
  revalidateMany([CSSD_ROUTES.thietBi, "/cssd-erp/equipment-maintenance"]);
}

/** Sau ghi sự cố / rollback. */
export function revalidateCssdIncidentSurfaces() {
  revalidateCssdWorkflowSurfaces();
  revalidateMany([CSSD_ROUTES.suCo, "/cssd-erp/su-co"]);
}
