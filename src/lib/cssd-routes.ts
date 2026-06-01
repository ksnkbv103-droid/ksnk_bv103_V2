/**
 * SSOT đường dẫn App Router — module CSSD BV103 (pilot).
 */
export const CSSD_ROUTES = {
  quyTrinh: "/cssd-quy-trinh",
  dungCu: "/cssd-dung-cu",
  suCo: "/cssd-su-co",
  thietBi: "/cssd-thiet-bi",
  hoaChat: "/cssd-hoa-chat",
  /** Mẻ tiệt khuẩn (deep link; tab batch cũng có trên quyTrinh). */
  batch: "/cssd-erp/batch",
  report: "/cssd-erp/report",
} as const;

/** Prefix cho shell CSSD (canonical + batch/report). */
export const CSSD_APP_SHELL_PREFIXES: readonly string[] = [
  CSSD_ROUTES.quyTrinh,
  CSSD_ROUTES.dungCu,
  CSSD_ROUTES.suCo,
  CSSD_ROUTES.thietBi,
  CSSD_ROUTES.hoaChat,
  "/cssd-erp",
];

export function pathnameIsCssdModule(pathname: string | null): boolean {
  const p = (pathname || "").trim();
  if (!p) return false;
  const norm = p.startsWith("/") ? p : `/${p}`;
  return CSSD_APP_SHELL_PREFIXES.some((prefix) => norm === prefix || norm.startsWith(`${prefix}/`));
}
