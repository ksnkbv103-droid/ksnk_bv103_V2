/**
 * Batch 8.2 — phạm vi gắn offline listener (không mọi trang admin/login).
 * Supervision queue: VST / GSC (và cổng giám sát / QR liên quan).
 * CSSD queue: SCAN_QR / REPORT_INCIDENT trên shell CSSD.
 */

import { CSSD_APP_SHELL_PREFIXES } from "./cssd-routes";

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const t = pathname.trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

/** Hàng đợi phiên giám sát ngoại tuyến (`SupervisionOfflineSyncListener`). */
export function pathnameNeedsSupervisionOfflineSync(pathname: string | null | undefined): boolean {
  const p = normalizePath(pathname);
  if (!p) return false;
  return (
    p === "/giam-sat" ||
    p.startsWith("/giam-sat/") ||
    p.startsWith("/giam-sat-vst") ||
    p.startsWith("/giam-sat-chung") ||
    p.startsWith("/giam-sat-nkbv") ||
    p === "/qr" ||
    p.startsWith("/qr/")
  );
}

/** Hàng đợi CSSD SCAN_QR / sự cố (`OfflineSyncManager`). */
export function pathnameNeedsCssdOfflineSync(pathname: string | null | undefined): boolean {
  const p = normalizePath(pathname);
  if (!p) return false;
  return CSSD_APP_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
