/**
 * SSOT đường dẫn App Router — module thành phần CSSD (sau phân rã).
 * Code UI / revalidate / link nên import từ đây thay vì hard-code chuỗi.
 */

export const CSSD_ROUTES = {
  quyTrinh: "/cssd-quy-trinh",
  dungCu: "/cssd-dung-cu",
  suCo: "/cssd-su-co",
  thietBi: "/cssd-thiet-bi",
  hoaChat: "/cssd-hoa-chat",

  /** Legacy mappings */
  tiepNhan: "/cssd-quy-trinh",
  dongGoi: "/cssd-quy-trinh",
  capPhat: "/cssd-quy-trinh",
  tietKhuan: "/cssd-quy-trinh",
  batch: "/cssd-quy-trinh",
  quanTri: "/cssd-dung-cu",
  khoHoaChat: "/cssd-hoa-chat",
  baoTriThietBi: "/cssd-thiet-bi",
  baoCao: "/cssd-erp/report",
  catalog: "/cssd-dung-cu",
  inventory: "/cssd-dung-cu",
  erpRoot: "/cssd-quy-trinh",
} as const;

export type CssdRouteKey = keyof typeof CSSD_ROUTES;

/** Prefix dùng cho shell layout / header / UX hints. */
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
