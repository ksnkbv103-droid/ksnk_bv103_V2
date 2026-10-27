import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  normalizeDeNghiItems,
  type CssdCatalogDeNghiBomLine,
  type CssdCatalogDeNghiItem,
  type CssdCatalogDeNghiRow,
} from "./cssd-catalog-de-nghi";

/** Một dòng so sánh trên phiếu: đối tượng · trường · cũ → mới. */
export type DeNghiDiffRow = { doiTuong: string; truong: string; cu: string; moi: string };

const LOAI_FIELDS: Array<[string, string]> = [
  ["ma_loai", "Mã loại"],
  ["ten_loai", "Tên loại"],
  ["mo_ta", "Mô tả"],
  ["hinh_dang", "Hình dáng"],
  ["kich_thuoc", "Kích thước"],
  ["cong_dung", "Công dụng"],
  ["is_chiu_nhiet", "Chịu nhiệt"],
  ["phuong_phap_tiet_khuan_chi_dinh", "Tiệt khuẩn chỉ định"],
  ["phan_loai_spaulding", "Phân loại Spaulding"],
  ["phan_loai", "Phân loại"],
  ["so_luong_kho_du_phong", "Tồn kho chưa dùng"],
  ["is_active", "Đang dùng"],
];

const BO_FIELDS: Array<[string, string]> = [
  ["ma_bo", "Mã bộ"],
  ["ten_bo", "Tên bộ"],
  ["quy_cach", "Quy cách"],
  ["ghi_chu", "Ghi chú"],
  ["trang_thai", "Trạng thái"],
  ["phan_loai_bo", "Phân loại"],
  ["is_active", "Đang dùng"],
];

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return "Có";
  if (v === false) return "Không";
  return String(v);
}

function diffFields(
  doiTuong: string,
  fields: Array<[string, string]>,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  isCreate: boolean,
): DeNghiDiffRow[] {
  const out: DeNghiDiffRow[] = [];
  for (const [key, label] of fields) {
    if (!(key in after)) continue;
    const cu = isCreate ? "—" : show(before[key]);
    const moi = show(after[key]);
    if (cu !== moi) out.push({ doiTuong, truong: label, cu, moi });
  }
  return out;
}

function bomKey(l: CssdCatalogDeNghiBomLine): string {
  return String(l.chiTietId || l.loaiDungCuId || l.maLoai || "");
}

function bomName(l: CssdCatalogDeNghiBomLine | undefined): string {
  return [l?.maLoai, l?.tenDungCuLe || l?.tenChiTiet].filter(Boolean).join(" · ") || "Thành phần";
}

function diffBom(
  doiTuong: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DeNghiDiffRow[] {
  const bLines = (Array.isArray(before.lines) ? before.lines : []) as CssdCatalogDeNghiBomLine[];
  const aLines = (Array.isArray(after.lines) ? after.lines : []) as CssdCatalogDeNghiBomLine[];
  const old = new Map(bLines.map((l) => [bomKey(l), l]));
  const out: DeNghiDiffRow[] = [];
  for (const l of aLines) {
    const prev = old.get(bomKey(l));
    const name = bomName(l.maLoai || l.tenDungCuLe ? l : prev);
    if (l.op === "DELETE") {
      out.push({ doiTuong, truong: name, cu: show(prev?.soLuong), moi: "Xóa khỏi bộ" });
      continue;
    }
    const cu = prev ? show(prev.soLuong) : "—";
    const moi = show(l.soLuong);
    if (cu !== moi) out.push({ doiTuong, truong: name, cu, moi });
  }
  return out;
}

function diffItem(it: CssdCatalogDeNghiItem): DeNghiDiffRow[] {
  const isCreate = it.op === "CREATE";
  const doiTuong = `${CSSD_CATALOG_DE_NGHI_KIND_LABEL[it.kind]} ${it.targetMa || ""}`.trim();
  if (it.kind === "LOAI") return diffFields(doiTuong, LOAI_FIELDS, it.before, it.after, isCreate);
  if (it.kind === "BO") return diffFields(doiTuong, BO_FIELDS, it.before, it.after, isCreate);
  return diffBom(doiTuong, it.before, it.after);
}

/** Phiếu → các dòng «cũ → mới» (chỉ trường đổi) để người duyệt đối chiếu và in. */
export function buildDeNghiDiffRows(
  r: Pick<CssdCatalogDeNghiRow, "targetKind" | "targetId" | "targetMa" | "targetTen" | "payloadBefore" | "payloadAfter">,
): DeNghiDiffRow[] {
  return normalizeDeNghiItems(r).flatMap(diffItem);
}
