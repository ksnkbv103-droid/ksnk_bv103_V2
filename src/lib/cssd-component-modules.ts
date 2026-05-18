/**
 * Bản đồ module thành phần CSSD ↔ route ↔ quyền ↔ entrypoint.
 */
import { CSSD_ROUTES } from "./cssd-routes";

export type CssdComponentModuleId =
  | "processing-lifecycle"
  | "sterilization-batch"
  | "incident"
  | "maintenance"
  | "inventory-instrument"
  | "inventory-chemical"
  | "instrument-catalog"
  | "reporting";

export type CssdComponentModuleDef = {
  id: CssdComponentModuleId;
  label: string;
  routes: readonly string[];
  permissionModules: readonly string[];
  contextNamespace: string;
};

export const CSSD_COMPONENT_MODULES: readonly CssdComponentModuleDef[] = [
  {
    id: "processing-lifecycle",
    label: "Quy trình quét trạm & kho FEFO",
    routes: [CSSD_ROUTES.quyTrinh],
    permissionModules: ["CSSD_WORKFLOW", "CSSD_KHO_DUNGCU"],
    contextNamespace: "CssdProcessingLifecycleContext",
  },
  {
    id: "sterilization-batch",
    label: "Mẻ tiệt khuẩn",
    routes: [CSSD_ROUTES.erpBatch],
    permissionModules: ["CSSD_ME_TIET_KHUAN", "CSSD_WORKFLOW"],
    contextNamespace: "CssdSterilizationBatchContext",
  },
  {
    id: "incident",
    label: "Báo cáo sự cố",
    routes: [CSSD_ROUTES.suCo, CSSD_ROUTES.erpSuCo],
    permissionModules: ["BAO_SU_CO"],
    contextNamespace: "CssdSuCoContext",
  },
  {
    id: "maintenance",
    label: "Bảo trì thiết bị",
    routes: [CSSD_ROUTES.thietBi, CSSD_ROUTES.erpBaoTri],
    permissionModules: ["CSSD_ME_TIET_KHUAN", "THIET_BI"],
    contextNamespace: "CssdMaintenanceContext",
  },
  {
    id: "inventory-instrument",
    label: "Kho dụng cụ (FEFO)",
    routes: [CSSD_ROUTES.quyTrinh, CSSD_ROUTES.erpInventory],
    permissionModules: ["CSSD_KHO_DUNGCU"],
    contextNamespace: "CssdInstrumentInventoryContext",
  },
  {
    id: "inventory-chemical",
    label: "Kho hóa chất / vật tư",
    routes: [CSSD_ROUTES.hoaChat, CSSD_ROUTES.erpKhoHoaChat],
    permissionModules: ["KSNK_KHO_HOACHAT"],
    contextNamespace: "CssdInventoryChemicalContext",
  },
  {
    id: "instrument-catalog",
    label: "Danh mục bộ & lịch sử",
    routes: [CSSD_ROUTES.dungCu, CSSD_ROUTES.erpCatalog],
    permissionModules: ["CSSD_KHO_DUNGCU", "DANH_MUC"],
    contextNamespace: "CssdInstrumentCatalogContext",
  },
  {
    id: "reporting",
    label: "Báo cáo CSSD",
    routes: [CSSD_ROUTES.erpReport],
    permissionModules: ["CSSD_REPORT"],
    contextNamespace: "CssdReportingContext",
  },
] as const;

export function findCssdComponentModuleByPath(pathname: string): CssdComponentModuleDef | null {
  for (const mod of CSSD_COMPONENT_MODULES) {
    if (mod.routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
      return mod;
    }
  }
  return null;
}
