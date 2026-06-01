/**
 * Phạm vi rollout shell / design system nội dung KSNK (bên trong `ClientLayoutWrapper` → `<main>`).
 * Bọc `KsnkPageShell`: giám sát, quản trị, CSSD (module thành phần), quản lý công việc — cùng max-width và token giao diện.
 */

import { CSSD_APP_SHELL_PREFIXES } from "./cssd-routes";

const KSNK_CONTENT_SHELL_PREFIXES: readonly string[] = [
  "/giam-sat",
  "/quan-tri-he-thong",
  ...CSSD_APP_SHELL_PREFIXES,
  "/quan-ly-cong-viec",
  "/tai-khoan",
];

function normalizePath(pathname: string | null): string {
  if (!pathname) return "";
  const t = pathname.trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

/** Pha 1: bọc `KsnkPageShell` trong `<main>` để max-width + nhịp layout thống nhất. */
export function pathnameUsesPhase1KsnkUnifiedContentShell(pathname: string | null): boolean {
  const p = normalizePath(pathname);
  if (!p || p === "/login" || p.startsWith("/login/")) return false;
  return KSNK_CONTENT_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Tiêu đề zone trên `Header` (top bar) — khớp pha 1 + các module khác tối thiểu. */
export function getKsnkAppHeaderTitle(pathname: string | null): string {
  const p = normalizePath(pathname);
  if (p === "/" || p === "") return "Dashboard";
  if (CSSD_APP_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return "Quản lý CSSD";
  }
  if (p.startsWith("/giam-sat-vst")) return "Giám sát vệ sinh tay";
  if (p.startsWith("/giam-sat-chung")) return "Giám sát chung";
  if (p.startsWith("/giam-sat")) return "Giám sát";
  if (p.startsWith("/quan-tri-he-thong")) return "Quản trị hệ thống";
  if (p.startsWith("/quan-ly-cong-viec")) return "Quản lý công việc";
  if (p.startsWith("/tai-khoan")) return "Tài khoản";
  return "Hệ thống KSNK";
}
