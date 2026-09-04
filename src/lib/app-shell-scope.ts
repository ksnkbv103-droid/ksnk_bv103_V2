/**
 * Phạm vi shell / context bar KSNK (`ClientLayoutWrapper` → `<main>`).
 * Lớp 1: `KsnkPageShell` bọc mọi route đã đăng nhập; hero module chỉ trên hub/tra cứu.
 *
 * SSOT tên trang App Header: một title rõ (không chồng zone/crumb nhóm nav).
 * Nội dung L1 không lặp H1 khi Header đã đặt tên — `showTitle={false}`.
 */

import { CSSD_APP_SHELL_PREFIXES, CSSD_ROUTES } from "./cssd-routes";

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
  /** @deprecated Zone nhóm nav — không hiển thị trên Header (giữ field cho tương thích). */
  zone: string;
  /** Tên module/trang duy nhất trên App Header (màu primary). */
  page?: string;
};

function title(zone: string, page: string): KsnkHeaderBreadcrumb {
  return { zone, page };
}

/** Context bar — một tên trang; zone chỉ metadata (không render). */
export function getKsnkAppHeaderBreadcrumb(pathname: string | null): KsnkHeaderBreadcrumb {
  const p = normalizePath(pathname);
  if (p === "/" || p === "") return title("Điều hành", "Tổng quan KSNK");
  if (p === "/bao-cao-tong-hop" || p.startsWith("/bao-cao-tong-hop/")) {
    return title("Điều hành", "Báo cáo chính thức");
  }

  if (p.startsWith("/giam-sat-vst")) return title("Giám sát", "Vệ sinh tay");
  if (p.startsWith("/giam-sat-chung")) return title("Giám sát", "Giám sát tuân thủ");
  if (p.startsWith("/giam-sat-nkbv")) return title("Giám sát", "NKBV");
  if (p === "/giam-sat" || p.startsWith("/giam-sat/")) return title("Giám sát", "Giám sát");
  if (p === "/qr" || p.startsWith("/qr/")) return title("Giám sát", "Quét QR truy vết");

  if (p.startsWith("/lich-su")) return title("Tra cứu", "Lịch sử giám sát");
  if (p.startsWith("/thong-ke")) return title("Tra cứu", "Thống kê giám sát");

  if (p.startsWith("/quan-ly-cong-viec")) return title("Vận hành", "Quản lý công việc");

  if (p.startsWith("/dao-tao")) {
    if (p.startsWith("/dao-tao/thi-thu")) return title("Vận hành", "Ôn tập");
    if (p.startsWith("/dao-tao/thi-that")) return title("Vận hành", "Thi chính thức");
    if (p.startsWith("/dao-tao/admin/ngan-hang")) return title("Vận hành", "Ngân hàng câu hỏi");
    if (p.startsWith("/dao-tao/admin/muc-do")) return title("Vận hành", "Mức ôn tập");
    if (p.startsWith("/dao-tao/admin/ky-thi")) return title("Vận hành", "Kỳ thi");
    if (p.startsWith("/dao-tao/admin/ket-qua")) return title("Vận hành", "Kết quả thi");
    if (p.startsWith("/dao-tao/ket-qua")) return title("Vận hành", "Kết quả bài thi");
    if (p.startsWith("/dao-tao/lam-bai")) return title("Vận hành", "Làm bài thi");
    return title("Vận hành", "Thi KSNK");
  }

  if (p === CSSD_ROUTES.quyTrinh || p.startsWith(`${CSSD_ROUTES.quyTrinh}/`)) {
    return title("CSSD", "Quy trình");
  }
  if (p === CSSD_ROUTES.suCo || p.startsWith(`${CSSD_ROUTES.suCo}/`)) {
    return title("CSSD", "Sự cố");
  }
  if (p === CSSD_ROUTES.dungCu || p.startsWith(`${CSSD_ROUTES.dungCu}/`)) {
    return title("CSSD", "Dụng cụ");
  }
  if (p === CSSD_ROUTES.thietBi || p.startsWith(`${CSSD_ROUTES.thietBi}/`)) {
    return title("CSSD", "Thiết bị");
  }
  if (p === CSSD_ROUTES.hoaChat || p.startsWith(`${CSSD_ROUTES.hoaChat}/`)) {
    return title("CSSD", "Hóa chất");
  }
  if (p === CSSD_ROUTES.batch || p.startsWith(`${CSSD_ROUTES.batch}/`)) {
    return title("CSSD", "Mẻ tiệt khuẩn");
  }
  if (p === CSSD_ROUTES.report || p.startsWith(`${CSSD_ROUTES.report}/`)) {
    return title("CSSD", "Báo cáo CSSD");
  }
  if (CSSD_APP_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return title("CSSD", "Quản lý CSSD");
  }

  if (p.startsWith("/quan-tri-he-thong")) {
    if (p.startsWith("/quan-tri-he-thong/phan-quyen")) return title("Quản trị", "Ma trận phân quyền");
    if (p.startsWith("/quan-tri-he-thong/tai-khoan-nhan-su")) return title("Quản trị", "Tài khoản nhân sự");
    if (p.startsWith("/quan-tri-he-thong/nhan-su")) return title("Quản trị", "Nhân sự");
    if (p.startsWith("/quan-tri-he-thong/bang-kiem")) return title("Quản trị", "Bảng kiểm");
    if (p.startsWith("/quan-tri-he-thong/danh-muc/khoa-phong")) return title("Quản trị", "Khoa phòng");
    if (p.startsWith("/quan-tri-he-thong/danh-muc/thiet-bi")) return title("Quản trị", "Thiết bị");
    if (p.startsWith("/quan-tri-he-thong/danh-muc/hoa-chat")) return title("Quản trị", "Hóa chất");
    if (p.startsWith("/quan-tri-he-thong/danh-muc/dung-cu")) return title("Quản trị", "Dụng cụ");
    if (p.startsWith("/quan-tri-he-thong/danh-muc")) return title("Quản trị", "Danh mục");
    return title("Quản trị", "Quản trị hệ thống");
  }

  if (p.startsWith("/tai-khoan/doi-mat-khau")) return title("Tài khoản", "Đổi mật khẩu");
  if (p.startsWith("/tai-khoan")) return title("Tài khoản", "Hồ sơ");

  return { zone: "Hệ thống KSNK", page: "Hệ thống KSNK" };
}
