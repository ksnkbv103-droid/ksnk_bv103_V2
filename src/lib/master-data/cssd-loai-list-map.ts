import {
  mapIsChiuNhietToKhaNang,
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
  resolveLoaiAlias,
  spauldingLabel,
  sterileMethodLabel,
} from "@/lib/master-data/cssd-loai-dung-cu-map";

export type LoaiDungCuListRow = {
  id: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  hinh_dang: string | null;
  kich_thuoc: string | null;
  cong_dung: string | null;
  is_chiu_nhiet: boolean;
  kha_nang_chiu_nhiet: "Cao" | "Thấp";
  phan_loai_spaulding: string;
  phan_loai_spaulding_label: string;
  phuong_phap_tiet_khuan: string;
  phuong_phap_tiet_khuan_label: string;
  phan_loai: string;
  so_luong_kho_du_phong: number;
  so_luong_tong: number;
  is_active: boolean;
};

const SORT_COL: Record<string, string> = {
  ma_danh_muc: "ma_loai",
  ten_danh_muc: "ten_loai",
  is_active: "is_active",
  phan_loai: "phan_loai",
  ma_loai: "ma_loai",
  ten_loai: "ten_loai",
};

export function loaiListSortColumn(sortKey: string): string {
  return SORT_COL[sortKey] || "ma_loai";
}

export function mapLoaiPhysicalToListRow(r: Record<string, unknown>): LoaiDungCuListRow {
  const alias = resolveLoaiAlias(r);
  const specs =
    r.specs && typeof r.specs === "object" && !Array.isArray(r.specs)
      ? (r.specs as Record<string, unknown>)
      : {};
  const isChiuNhiet = r.is_chiu_nhiet !== false;
  const sterile = normalizeSterileMethodForMaster(
    r.phuong_phap_tiet_khuan_chi_dinh ?? r.phuong_phap_tiet_khuan,
  );
  const spaulding = normalizeSpauldingForMaster(r.phan_loai_spaulding);
  const strOrNull = (v: unknown) => (v == null || v === "" ? null : String(v));
  const duPhong = Number(r.so_luong_kho_du_phong || 0);
  return {
    id: String(r.id || ""),
    ma_danh_muc: alias.ma_loai_dung_cu || String(r.ma_loai || ""),
    ten_danh_muc: alias.ten_loai_dung_cu || String(r.ten_loai || ""),
    hinh_dang: strOrNull(r.hinh_dang ?? specs.hinh_dang),
    kich_thuoc: strOrNull(r.kich_thuoc ?? specs.kich_thuoc),
    cong_dung: strOrNull(r.cong_dung ?? specs.cong_dung),
    is_chiu_nhiet: isChiuNhiet,
    kha_nang_chiu_nhiet: mapIsChiuNhietToKhaNang(isChiuNhiet),
    phan_loai_spaulding: spaulding,
    phan_loai_spaulding_label: spauldingLabel(spaulding),
    phuong_phap_tiet_khuan: sterile,
    phuong_phap_tiet_khuan_label: sterileMethodLabel(sterile),
    phan_loai: String(r.phan_loai || "PHAU_THUAT"),
    so_luong_kho_du_phong: duPhong,
    so_luong_tong: duPhong,
    is_active: r.is_active !== false,
  };
}

/** Tồn loại trên màn xem: Tổng = trong bộ + kho lẻ. Không đẻ bảng tổng hợp. */
export function splitLoaiStock(kho: number, trongBo: number) {
  const so_luong_kho_du_phong = Math.max(0, Number(kho) || 0);
  const so_luong_trong_bo = Math.max(0, Number(trongBo) || 0);
  return {
    so_luong_kho_du_phong,
    so_luong_trong_bo,
    so_luong_tong: so_luong_kho_du_phong + so_luong_trong_bo,
  };
}
