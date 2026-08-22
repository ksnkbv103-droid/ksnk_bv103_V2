/**
 * SSOT danh sách hub Quản trị — sidebar, trung tâm danh mục, tìm kiếm xuyên catalog.
 */
import type { DanhMucStat, TrungTamDanhMucStatsPayload } from "@/modules/quan-tri-he-thong/danh-muc/actions/danh-muc-hybrid.types";
import {
  DM_HUB_LABELS,
  getRegistryEntriesForChuyenBietHub,
  type RegistryEntry,
} from "./domain-registry";
import { getDanhMucAdminPath } from "./danh-muc-admin-routes";
import { quanTriDungCuHref, quanTriHubHref } from "./quan-tri-paths";

export type DanhMucDomain = "MDM" | "CSSD" | "GSTT" | "QLCV" | "NKBV" | "RBAC";

export type DanhMucHubGroup =
  | "to-chuc"
  | "cssd"
  | "giam-sat"
  | "nkbv"
  | "cong-viec"
  | "he-thong"
  | "lookup";

export type DanhMucHubTier = "dedicated" | "lookup";

export type DanhMucHubRow = {
  id: string;
  name: string;
  path: string;
  domain: DanhMucDomain;
  group: DanhMucHubGroup;
  tier: DanhMucHubTier;
  moduleKey?: string;
  loaiDanhMuc?: string;
  sourceTable?: string;
  stats?: DanhMucStat;
};

/** Nhãn hub theo ngôn ngữ viện — key kỹ thuật giữ ổn định. */
export const DANH_MUC_HUB_GROUP_LABELS: Record<DanhMucHubGroup, string> = {
  "to-chuc": "Tổ chức & nhân sự",
  "giam-sat": "Giám sát & bảng kiểm",
  cssd: "Master CSSD",
  nkbv: "NKBV",
  "cong-viec": "Công việc (mẫu)",
  "he-thong": "Hệ thống & quyền",
  lookup: "Danh mục dùng chung",
};

/** Thứ tự hiển thị hub (SSOT). */
const DANH_MUC_HUB_GROUP_ORDER: DanhMucHubGroup[] = [
  "to-chuc",
  "giam-sat",
  "cssd",
  "nkbv",
  "cong-viec",
  "lookup",
  "he-thong",
];

export const DANH_MUC_DOMAIN_BADGE: Record<DanhMucDomain, { label: string; className: string }> = {
  MDM: { label: "Tổ chức", className: "bg-rose-50 text-rose-700 ring-rose-600/15" },
  CSSD: { label: "CSSD", className: "bg-emerald-50 text-emerald-800 ring-emerald-600/15" },
  GSTT: { label: "Giám sát", className: "bg-orange-50 text-orange-800 ring-orange-600/15" },
  QLCV: { label: "Công việc", className: "bg-violet-50 text-violet-800 ring-violet-600/15" },
  NKBV: { label: "NKBV", className: "bg-sky-50 text-sky-800 ring-sky-600/15" },
  RBAC: { label: "Quyền", className: "bg-slate-100 text-slate-700 ring-slate-400/20" },
};

const DEDICATED_ROWS: Omit<DanhMucHubRow, "stats">[] = [
  {
    id: "dung-cu-loai",
    name: "Loại dụng cụ",
    path: quanTriDungCuHref("loai"),
    domain: "CSSD",
    group: "cssd",
    tier: "dedicated",
    moduleKey: "LOAI_DC",
    sourceTable: "cssd_dm_loai_dung_cu",
  },
  {
    id: "dung-cu-bo",
    name: "Bộ dụng cụ",
    path: quanTriDungCuHref("bo"),
    domain: "CSSD",
    group: "cssd",
    tier: "dedicated",
    moduleKey: "BO_DC",
    sourceTable: "cssd_dm_bo_dung_cu",
  },
  {
    id: "dung-cu-le",
    name: "Thành phần bộ (trong bộ)",
    path: quanTriDungCuHref("bo"),
    domain: "CSSD",
    group: "cssd",
    tier: "dedicated",
    moduleKey: "DC_LE",
    sourceTable: "cssd_dm_bo_dung_cu_chi_tiet",
  },
  {
    id: "tb",
    name: "Thiết bị và máy",
    path: "/quan-tri-he-thong/danh-muc/thiet-bi",
    domain: "CSSD",
    group: "cssd",
    tier: "dedicated",
    moduleKey: "THIET_BI",
    sourceTable: "cssd_dm_thiet_bi",
  },
  {
    id: "hc",
    name: "Hóa chất và vật tư",
    path: "/quan-tri-he-thong/danh-muc/hoa-chat",
    domain: "CSSD",
    group: "cssd",
    tier: "dedicated",
    moduleKey: "HOA_CHAT",
    sourceTable: "cssd_dm_hoa_chat",
  },
  {
    id: "khoa",
    name: "Khoa phòng",
    path: "/quan-tri-he-thong/danh-muc/khoa-phong",
    domain: "MDM",
    group: "to-chuc",
    tier: "dedicated",
    moduleKey: "KHOA_PHONG",
    loaiDanhMuc: "KHOA_PHONG",
    sourceTable: "mdm_dm_khoa_phong",
  },
  {
    id: "ns",
    name: "Hồ sơ nhân sự",
    path: "/quan-tri-he-thong/nhan-su",
    domain: "MDM",
    group: "to-chuc",
    tier: "dedicated",
    moduleKey: "NHAN_SU",
    sourceTable: "mdm_nhan_su",
  },
  {
    id: "bk",
    name: "Mẫu bảng kiểm",
    path: "/quan-tri-he-thong/bang-kiem",
    domain: "GSTT",
    group: "giam-sat",
    tier: "dedicated",
    moduleKey: "BANG_KIEM",
    sourceTable: "gstt_dm_bang_kiem",
  },
];

function domainForRegistryEntry(entry: RegistryEntry): DanhMucDomain {
  const t = entry.sourceTable;
  if (t.startsWith("cssd_")) return "CSSD";
  if (t.startsWith("gstt_")) return "GSTT";
  if (t.startsWith("qlcv_")) return "QLCV";
  if (t.startsWith("nkbv_")) return "NKBV";
  if (t === "sys_roles") return "RBAC";
  return "MDM";
}

function groupForRegistryEntry(entry: RegistryEntry): DanhMucHubGroup {
  const d = domainForRegistryEntry(entry);
  if (d === "CSSD") return "cssd";
  if (d === "GSTT") return "giam-sat";
  if (d === "NKBV") return "nkbv";
  if (d === "QLCV") return "cong-viec";
  if (d === "RBAC") return "he-thong";
  if (["KHOI_KHOA", "TO_CONG_TAC", "CHUC_VU", "CHUC_DANH", "NGHE_NGHIEP"].includes(entry.loaiDanhMuc)) {
    return "to-chuc";
  }
  return "lookup";
}

function statsKeyForDedicated(id: string): keyof TrungTamDanhMucStatsPayload | null {
  const map: Record<string, keyof TrungTamDanhMucStatsPayload> = {
    "dung-cu-loai": "loai",
    "dung-cu-bo": "bo",
    "dung-cu-le": "le",
    tb: "tb",
    hc: "hc",
    khoa: "khoa",
    ns: "ns",
    bk: "bk",
    tk: "tk",
  };
  return map[id] ?? null;
}

function rowFromRegistry(entry: RegistryEntry, stats: Partial<TrungTamDanhMucStatsPayload>): DanhMucHubRow {
  const byLoai = stats.registryByLoai || {};
  return {
    id: entry.loaiDanhMuc,
    name: DM_HUB_LABELS[entry.loaiDanhMuc] || entry.loaiDanhMuc,
    path: getDanhMucAdminPath(entry.loaiDanhMuc),
    domain: domainForRegistryEntry(entry),
    group: groupForRegistryEntry(entry),
    tier: "lookup",
    loaiDanhMuc: entry.loaiDanhMuc,
    sourceTable: entry.sourceTable,
    stats: byLoai[entry.loaiDanhMuc] || { count: 0 },
  };
}

export function getAllDanhMucHubRows(options: {
  stats: Partial<TrungTamDanhMucStatsPayload>;
  includeTaiKhoan?: boolean;
}): DanhMucHubRow[] {
  const { stats, includeTaiKhoan = false } = options;
  const dedicated: DanhMucHubRow[] = DEDICATED_ROWS.map((r) => {
    const key = statsKeyForDedicated(r.id);
    const rowStats = key ? (stats[key] as DanhMucStat | undefined) : undefined;
    return { ...r, stats: rowStats };
  });
  const lookup = getRegistryEntriesForChuyenBietHub().map((e) => rowFromRegistry(e, stats));
  const system: DanhMucHubRow[] = includeTaiKhoan
    ? [
        {
          id: "tk",
          name: "Tài khoản và vai trò KSNK",
          path: "/quan-tri-he-thong/tai-khoan-nhan-su",
          domain: "RBAC",
          group: "he-thong",
          tier: "dedicated",
          moduleKey: "PHAN_QUYEN",
          stats: stats.tk,
        },
        {
          id: "phan-quyen",
          name: "Ma trận phân quyền",
          path: quanTriHubHref("PHAN_QUYEN"),
          domain: "RBAC",
          group: "he-thong",
          tier: "dedicated",
          moduleKey: "PHAN_QUYEN",
        },
      ]
    : [];
  return [...dedicated, ...lookup, ...system];
}

export function filterDanhMucHubRows(rows: DanhMucHubRow[], query: string): DanhMucHubRow[] {
  const t = query.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(t) ||
      r.path.toLowerCase().includes(t) ||
      r.domain.toLowerCase().includes(t) ||
      DANH_MUC_HUB_GROUP_LABELS[r.group].toLowerCase().includes(t) ||
      (r.sourceTable != null && r.sourceTable.toLowerCase().includes(t)) ||
      (r.loaiDanhMuc != null && r.loaiDanhMuc.toLowerCase().includes(t)),
  );
}

export function groupDanhMucHubRows(rows: DanhMucHubRow[]): { group: DanhMucHubGroup; label: string; rows: DanhMucHubRow[] }[] {
  return DANH_MUC_HUB_GROUP_ORDER
    .map((group) => ({
      group,
      label: DANH_MUC_HUB_GROUP_LABELS[group],
      rows: rows.filter((r) => r.group === group),
    }))
    .filter((g) => g.rows.length > 0);
}

/** Top N danh mục cập nhật gần nhất (Wave 4 — lịch sử nhẹ). */
export function getRecentDanhMucHubChanges(rows: DanhMucHubRow[], limit = 5): DanhMucHubRow[] {
  return [...rows]
    .filter((r) => r.stats?.last)
    .sort((a, b) => new Date(b.stats!.last!).getTime() - new Date(a.stats!.last!).getTime())
    .slice(0, limit);
}
