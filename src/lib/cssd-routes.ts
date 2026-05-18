/**
 * SSOT đường dẫn App Router — module thành phần CSSD BV103.
 */
export const CSSD_ROUTES = {
  quyTrinh: "/cssd-quy-trinh",
  dungCu: "/cssd-dung-cu",
  suCo: "/cssd-su-co",
  thietBi: "/cssd-thiet-bi",
  hoaChat: "/cssd-hoa-chat",

  /** Nested legacy (vẫn dùng cho mẻ TK / báo cáo chuyên sâu) */
  erpRoot: "/cssd-erp",
  erpBatch: "/cssd-erp/batch",
  erpReport: "/cssd-erp/report",
  erpSuCo: "/cssd-erp/su-co",
  erpInventory: "/cssd-erp/inventory",
  erpCatalog: "/cssd-erp/catalog",
  erpKhoHoaChat: "/cssd-erp/kho-hoa-chat",
  erpBaoTri: "/cssd-erp/equipment-maintenance",
} as const;

/** Alias tương thích code / revalidate cũ → route canonical. */
export const CSSD_ROUTE_ALIASES = {
  tiepNhan: CSSD_ROUTES.quyTrinh,
  dongGoi: CSSD_ROUTES.quyTrinh,
  capPhat: CSSD_ROUTES.quyTrinh,
  tietKhuan: CSSD_ROUTES.erpBatch,
  batch: CSSD_ROUTES.erpBatch,
  quanTri: CSSD_ROUTES.dungCu,
  khoHoaChat: CSSD_ROUTES.hoaChat,
  baoTriThietBi: CSSD_ROUTES.thietBi,
  baoCao: CSSD_ROUTES.erpReport,
  catalog: CSSD_ROUTES.dungCu,
  inventory: CSSD_ROUTES.dungCu,
  suCo: CSSD_ROUTES.suCo,
} as const;

export type CssdRouteKey = keyof typeof CSSD_ROUTES | keyof typeof CSSD_ROUTE_ALIASES;

export const CSSD_APP_SHELL_PREFIXES: readonly string[] = [
  CSSD_ROUTES.quyTrinh,
  CSSD_ROUTES.dungCu,
  CSSD_ROUTES.suCo,
  CSSD_ROUTES.thietBi,
  CSSD_ROUTES.hoaChat,
  CSSD_ROUTES.erpRoot,
];

export function pathnameIsCssdModule(pathname: string | null): boolean {
  const p = (pathname || "").trim();
  if (!p) return false;
  const norm = p.startsWith("/") ? p : `/${p}`;
  return CSSD_APP_SHELL_PREFIXES.some((prefix) => norm === prefix || norm.startsWith(`${prefix}/`));
}

export function pathnameMatchesCssdRoute(pathname: string | null, route: string): boolean {
  const p = (pathname || "").trim();
  if (!p) return false;
  const norm = p.startsWith("/") ? p : `/${p}`;
  return norm === route || norm.startsWith(`${route}/`);
}
