/**
 * Phạm vi shell / context bar KSNK (`ClientLayoutWrapper` → `<main>`).
 * Lớp 1: `KsnkPageShell` bọc mọi route đã đăng nhập; hero module chỉ trên hub/tra cứu.
 */

import { CSSD_APP_SHELL_PREFIXES } from "./cssd-routes";

function normalizePath(pathname: string | null): string {
  if (!pathname) return "";
  const t = pathname.trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** Bọc `KsnkPageShell` — mọi trang sau đăng nhập (trừ auth). */
export function pathnameUsesPhase1KsnkUnifiedContentShell(pathname: string | null): boolean {
  const p = normalizePath(pathname);
  if (!p || isLoginPath(p)) return false;
  return true;
}

export type KsnkHeaderBreadcrumb = {
  zone: string;
  page?: string;
};

/** Context bar — zone + trang hiện tại. */
export function getKsnkAppHeaderBreadcrumb(pathname: string | null): KsnkHeaderBreadcrumb {
  const p = normalizePath(pathname);
  if (p === "/" || p === "") return { zone: "Điều hành", page: "Trung tâm điều hành" };
  if (p === "/bao-cao-tong-hop" || p.startsWith("/bao-cao-tong-hop/")) {
    return { zone: "Điều hành", page: "Báo cáo tổng hợp" };
  }
  if (p.startsWith("/giam-sat-vst")) return { zone: "Giám sát", page: "Vệ sinh tay" };
  if (p.startsWith("/giam-sat-chung")) return { zone: "Giám sát", page: "Giám sát tuân thủ" };
  if (p.startsWith("/giam-sat-nkbv")) return { zone: "Giám sát", page: "NKBV" };
  if (p === "/giam-sat") return { zone: "Giám sát", page: "Trung tâm giám sát" };
  if (p.startsWith("/lich-su")) return { zone: "Tra cứu", page: "Lịch sử giám sát" };
  if (p.startsWith("/thong-ke")) return { zone: "Tra cứu", page: "Thống kê giám sát" };
  if (p.startsWith("/quan-ly-cong-viec")) return { zone: "Vận hành", page: "Công việc" };
  if (CSSD_APP_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return { zone: "CSSD", page: "Quản lý CSSD" };
  }
  if (p.startsWith("/quan-tri-he-thong")) return { zone: "Quản trị", page: "Hệ thống" };
  if (p.startsWith("/tai-khoan")) return { zone: "Tài khoản", page: "Hồ sơ" };
  return { zone: "Hệ thống KSNK" };
}

/** @deprecated Dùng `getKsnkAppHeaderBreadcrumb`. */
export function getKsnkAppHeaderTitle(pathname: string | null): string {
  const crumb = getKsnkAppHeaderBreadcrumb(pathname);
  return crumb.page ? `${crumb.zone} · ${crumb.page}` : crumb.zone;
}
