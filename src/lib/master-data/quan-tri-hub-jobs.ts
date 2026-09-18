import type { DanhMucHubGroup, DanhMucHubRow } from "./danh-muc-hub-catalog";
import { isLockedSystemLookup } from "./locked-system-lookups";
import { quanTriDungCuHref } from "./quan-tri-paths";

export type QuanTriHubJobId = "to-chuc" | "bang-kiem" | "cssd" | "nguoi-dung";

export type QuanTriHubJob = {
  id: QuanTriHubJobId;
  title: string;
  blurb: string;
  href: string;
  group: DanhMucHubGroup;
};

/** Bốn việc hàng ngày — không phải catalog bảng. */
export const QUAN_TRI_HUB_JOBS: QuanTriHubJob[] = [
  {
    id: "to-chuc",
    title: "Tổ chức và người",
    blurb: "Khoa, hồ sơ nhân sự, chức danh.",
    href: "/quan-tri-he-thong/nhan-su",
    group: "to-chuc",
  },
  {
    id: "bang-kiem",
    title: "Bảng kiểm",
    blurb: "Mẫu giám sát và khoa áp dụng.",
    href: "/quan-tri-he-thong/bang-kiem",
    group: "giam-sat",
  },
  {
    id: "cssd",
    title: "Sửa danh mục CSSD",
    blurb: "Loại (trung tâm), bộ, máy, hóa chất — một cửa.",
    href: quanTriDungCuHref("loai"),
    group: "cssd",
  },
  {
    id: "nguoi-dung",
    title: "Tài khoản & truy cập",
    blurb: "Phiếu chờ duyệt, nhân sự Auth, phân quyền.",
    href: "/quan-tri-he-thong/tai-khoan",
    group: "he-thong",
  },
];

export function isDefaultVisibleHubRow(row: DanhMucHubRow): boolean {
  if (row.loaiDanhMuc && isLockedSystemLookup(row.loaiDanhMuc)) return false;
  return true;
}

export function visibleHubRows(rows: DanhMucHubRow[], query: string): DanhMucHubRow[] {
  if (query.trim()) return rows;
  return rows.filter(isDefaultVisibleHubRow);
}

export function rowsForHubJob(rows: DanhMucHubRow[], job: QuanTriHubJobId): DanhMucHubRow[] {
  const jobMeta = QUAN_TRI_HUB_JOBS.find((j) => j.id === job);
  if (!jobMeta) return [];
  return rows.filter((r) => r.group === jobMeta.group && isDefaultVisibleHubRow(r));
}
