/** Map một dòng `v_mdm_nhan_su_full` → shape UI (alias chuc_* từ view). */

export type NhanSuViewUiShape = {
  chuc_danh: string;
  chuc_vu: string;
  vai_tro_he_thong_ksnk: string;
  ten_nghe_nghiep_dm: unknown;
  khoa?: { id: unknown; ten_khoa: unknown };
  to?: { id: unknown; ten_danh_muc: unknown };
  nghe_nghiep?: { id: unknown; ten_nghe_nghiep: string };
};

export function mapNhanSuViewRow<T extends Record<string, unknown>>(x: T): T & NhanSuViewUiShape {
  return {
    ...x,
    khoa: x.khoa_id ? { id: x.khoa_id, ten_khoa: x.ten_khoa } : undefined,
    to: x.to_id ? { id: x.to_id, ten_danh_muc: x.ten_to } : undefined,
    nghe_nghiep: x.nghe_nghiep_id
      ? { id: x.nghe_nghiep_id, ten_nghe_nghiep: String(x.ten_nghe_nghiep ?? "") }
      : undefined,
    chuc_danh: String(x.chuc_danh ?? x.ten_chuc_danh ?? ""),
    chuc_vu: String(x.chuc_vu ?? x.ten_chuc_vu ?? ""),
    vai_tro_he_thong_ksnk: String(x.vai_tro_he_thong_ksnk ?? x.ten_vai_tro ?? ""),
    ten_nghe_nghiep_dm: x.ten_nghe_nghiep,
  };
}
