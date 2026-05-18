/**
 * Bản đồ module thành phần CSSD ↔ route ↔ quyền ↔ entrypoint bounded context.
 * Implementation vẫn nằm chủ yếu trong `cssd-erp` + `cssd-su-co`; lớp này là contract vận hành.
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
  /** Khóa MODULE_REGISTRY — OR để vào menu */
  permissionModules: readonly string[];
  contextNamespace: string;
};

export const CSSD_COMPONENT_MODULES: readonly CssdComponentModuleDef[] = [
  {
    id: "processing-lifecycle",
    label: "Quy trình quét trạm",
    routes: [CSSD_ROUTES.tiepNhan, CSSD_ROUTES.dongGoi, CSSD_ROUTES.capPhat],
    permissionModules: ["CSSD_WORKFLOW"],
    contextNamespace: "CssdProcessingLifecycleContext",
  },
  {
    id: "sterilization-batch",
    label: "Mẻ tiệt khuẩn",
    routes: [CSSD_ROUTES.tietKhuan, CSSD_ROUTES.batch],
    permissionModules: ["CSSD_ME_TIET_KHUAN", "CSSD_WORKFLOW"],
    contextNamespace: "CssdSterilizationBatchContext",
  },
  {
    id: "incident",
    label: "Báo cáo sự cố",
    routes: [CSSD_ROUTES.suCo],
    permissionModules: ["BAO_SU_CO"],
    contextNamespace: "CssdSuCoContext",
  },
  {
    id: "maintenance",
    label: "Bảo trì thiết bị",
    routes: [CSSD_ROUTES.baoTriThietBi],
    permissionModules: ["CSSD_ME_TIET_KHUAN"],
    contextNamespace: "CssdMaintenanceContext",
  },
  {
    id: "inventory-instrument",
    label: "Kho dụng cụ (FEFO)",
    routes: [CSSD_ROUTES.quanTri, CSSD_ROUTES.inventory],
    permissionModules: ["CSSD_KHO_DUNGCU"],
    contextNamespace: "CssdInstrumentInventoryContext",
  },
  {
    id: "inventory-chemical",
    label: "Kho hóa chất / vật tư",
    routes: [CSSD_ROUTES.khoHoaChat],
    permissionModules: ["KSNK_KHO_HOACHAT"],
    contextNamespace: "CssdInventoryChemicalContext",
  },
  {
    id: "instrument-catalog",
    label: "Danh mục & đăng ký nhãn QR",
    routes: [CSSD_ROUTES.quanTri, CSSD_ROUTES.catalog],
    permissionModules: ["CSSD_KHO_DUNGCU", "DANH_MUC"],
    contextNamespace: "CssdInstrumentCatalogContext",
  },
  {
    id: "reporting",
    label: "Báo cáo CSSD",
    routes: [CSSD_ROUTES.baoCao],
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
