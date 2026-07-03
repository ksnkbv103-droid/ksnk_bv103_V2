import type { DanhMucStat } from "@/modules/quan-tri-he-thong/danh-muc/actions/danh-muc-hybrid.types";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "./domain-registry";
import { quanTriDungCuHref } from "./quan-tri-paths";

/** Route chuyên dụng (form đầy đủ) — khớp tab Trung tâm Danh mục. */
const DEDICATED_LOAI_TO_PATH: Record<string, string> = {
  KHOA_PHONG: "/quan-tri-he-thong/danh-muc/khoa-phong",
  LOAI_DUNG_CU: "/quan-tri-he-thong/danh-muc/dung-cu",
};

/** `loaiDanhMuc` có trang quản trị riêng (không dùng generic chuyen-biet làm nguồn chính). */
export function isDedicatedDanhMucLoai(loaiDanhMuc: string): boolean {
  return REGISTRY_LOAI_TRUNG_TAM_ONLY.has(loaiDanhMuc.trim());
}

/** Đường dẫn quản trị chuẩn theo registry: dedicated nếu có, không thì `/danh-muc/chuyen-biet/[LOAI]`. */
export function getDanhMucAdminPath(loaiDanhMuc: string): string {
  const k = loaiDanhMuc.trim();
  const dedicated = DEDICATED_LOAI_TO_PATH[k];
  if (dedicated) return dedicated;
  return `/quan-tri-he-thong/danh-muc/chuyen-biet/${encodeURIComponent(k)}`;
}

export type InstrumentMdmHubRow = {
  id: string;
  name: string;
  path: string;
  stats?: DanhMucStat;
  subtitle: string;
};

/** Ba phân hệ dụng cụ CSSD — hiển thị riêng trên hub (không gộp một thẻ). */
export function getInstrumentMdmHubRows(stats: {
  loai?: DanhMucStat;
  bo?: DanhMucStat;
  le?: DanhMucStat;
}): InstrumentMdmHubRow[] {
  return [
    {
      id: "INSTRUMENT_LOAI",
      name: "Loại dụng cụ (CSSD)",
      path: quanTriDungCuHref("loai"),
      stats: stats.loai,
      subtitle: "cssd_dm_loai_dung_cu · LOAI_DC",
    },
    {
      id: "INSTRUMENT_BO",
      name: "Bộ dụng cụ (CSSD)",
      path: quanTriDungCuHref("bo"),
      stats: stats.bo,
      subtitle: "cssd_dm_bo_dung_cu · BO_DC",
    },
    {
      id: "INSTRUMENT_CHI_TIET",
      name: "Thành phần bộ (CSSD)",
      path: quanTriDungCuHref("chi-tiet"),
      stats: stats.le,
      subtitle: "cssd_dm_bo_dung_cu_chi_tiet · DC_LE",
    },
  ];
}
