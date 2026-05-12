import type { ThietBiRow } from "../actions/thiet-bi.actions";

export type ThietBiFormValues = {
  id?: string;
  ma_thiet_bi: string;
  ten_thiet_bi: string;
  loai_thiet_bi: string;
  trang_thai: string;
  hang_san_xuat: string;
  nam_san_xuat: string;
  ngay_dua_vao_su_dung: string;
  chu_ky_bao_tri_ngay: string;
  ngay_bao_tri_gan_nhat: string;
  ngay_bao_tri_tiep_theo: string;
  ghi_chu: string;
  is_active: boolean;
};

function dateOnly(v: string | null | undefined): string {
  return v ? String(v).slice(0, 10) : "";
}

export function mapThietBiToForm(row: ThietBiRow | null): ThietBiFormValues {
  if (!row) {
    return {
      ma_thiet_bi: "",
      ten_thiet_bi: "",
      loai_thiet_bi: "",
      trang_thai: "READY",
      hang_san_xuat: "",
      nam_san_xuat: "",
      ngay_dua_vao_su_dung: "",
      chu_ky_bao_tri_ngay: "180",
      ngay_bao_tri_gan_nhat: "",
      ngay_bao_tri_tiep_theo: "",
      ghi_chu: "",
      is_active: true,
    };
  }

  return {
    id: row.id,
    ma_thiet_bi: String(row.ma_thiet_bi || ""),
    ten_thiet_bi: String(row.ten_thiet_bi || ""),
    loai_thiet_bi: String(row.loai_thiet_bi || ""),
    trang_thai: String(row.trang_thai || "READY"),
    hang_san_xuat: String(row.hang_san_xuat || ""),
    nam_san_xuat: row.nam_san_xuat == null ? "" : String(row.nam_san_xuat),
    ngay_dua_vao_su_dung: dateOnly(row.ngay_dua_vao_su_dung),
    chu_ky_bao_tri_ngay: row.chu_ky_bao_tri_ngay == null ? "180" : String(row.chu_ky_bao_tri_ngay),
    ngay_bao_tri_gan_nhat: dateOnly(row.ngay_bao_tri_gan_nhat),
    ngay_bao_tri_tiep_theo: dateOnly(row.ngay_bao_tri_tiep_theo),
    ghi_chu: String(row.ghi_chu || ""),
    is_active: row.is_active !== false,
  };
}
