import {
  SET_RECONCILE_KIND_LABEL,
  formatLoaiDungCuLabel,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";

/** Bảng master loại / bộ / thành phần — form MDM chỉ ADMIN ghi. */
export const CSSD_CATALOG_MASTER_TABLES = [
  "cssd_dm_loai_dung_cu",
  "cssd_dm_bo_dung_cu",
  "cssd_dm_bo_dung_cu_chi_tiet",
] as const;

export type CssdCatalogMasterTable = (typeof CSSD_CATALOG_MASTER_TABLES)[number];

export const CSSD_CATALOG_MASTER_MODULES = ["LOAI_DC", "BO_DC", "DC_LE"] as const;

export function isCssdCatalogMasterTable(tableName: string): boolean {
  return (CSSD_CATALOG_MASTER_TABLES as readonly string[]).includes(String(tableName || "").trim());
}

export function cssdCatalogMasterWriteDeniedMessage(): string {
  return "Chỉ quản trị (ADMIN) được thêm/sửa/xóa danh mục master loại, bộ và thành phần. Nhân viên đề nghị qua phiếu rà soát; tổ trưởng hoặc admin duyệt rồi hệ thống mới ghi sổ chuẩn.";
}

/** Ghi form MDM: chỉ ADMIN. Quyền BO_DC.edit / DC_LE.edit vẫn dùng để duyệt phiếu. */
export function canHardWriteCssdCatalogMaster(args: { isAdmin: boolean }): boolean {
  return args.isAdmin === true;
}

export function assertCssdCatalogMasterWriteAllowed(isAdmin: boolean): void {
  if (!canHardWriteCssdCatalogMaster({ isAdmin })) {
    throw new Error(cssdCatalogMasterWriteDeniedMessage());
  }
}

export type CatalogApprovalDiff = {
  kindLabel: string;
  before: string;
  after: string;
};

function qty(n: number | undefined): string {
  return Number.isFinite(Number(n)) ? String(Math.floor(Number(n))) : "—";
}

/** Tóm tắt trước/sau một dòng đề nghị đổi chuẩn — hàng chờ duyệt. */
export function formatCatalogApprovalDiff(line: SetReconcileLineInput): CatalogApprovalDiff {
  const kindLabel = SET_RECONCILE_KIND_LABEL[line.kind] || line.kind;
  const name = formatLoaiDungCuLabel(line.maLoai, line.tenDungCuLe);
  if (line.kind === "DOI_CHUAN") {
    return {
      kindLabel,
      before: `${name} × ${qty(line.soLuongChuan)}`,
      after: qty(line.soLuongChuanDeXuat),
    };
  }
  if (line.kind === "DOI_LOAI") {
    return {
      kindLabel,
      before: name,
      after: formatLoaiDungCuLabel(line.maLoaiDeXuat, line.tenDungCuLeDeXuat || line.tenDungCuLe),
    };
  }
  if (line.kind === "THEM_DONG") {
    return {
      kindLabel,
      before: "—",
      after: `${formatLoaiDungCuLabel(line.maLoaiDeXuat || line.maLoai, line.tenDungCuLeDeXuat || line.tenDungCuLe)} × ${qty(line.soLuongChuanDeXuat ?? line.soLuongChuan)}`,
    };
  }
  if (line.kind === "XOA_DONG") {
    return {
      kindLabel,
      before: `${name} × ${qty(line.soLuongChuan)}`,
      after: "—",
    };
  }
  return { kindLabel, before: name, after: "—" };
}
