/** Deep-link BN / MDRO → form tuân thủ (`?bk=&ma_benh_an=&…`). */

export type GscPatientPrefill = {
  bangKiemMa: string | null;
  khoaId: string | null;
  maBenhAn: string | null;
  maNguoiBenh: string | null;
  tenNguoiBenh: string | null;
  boSungNb: boolean;
};

export function parseGscPatientPrefill(params: {
  bk?: string;
  khoa_id?: string;
  ma_benh_an?: string;
  ma_nguoi_benh?: string;
  ten_nguoi_benh?: string;
  bo_sung_nb?: string;
}): GscPatientPrefill | null {
  const bangKiemMa = String(params.bk || "").trim() || null;
  const khoaId = String(params.khoa_id || "").trim() || null;
  const maBenhAn = String(params.ma_benh_an || "").trim() || null;
  const maNguoiBenh = String(params.ma_nguoi_benh || "").trim() || null;
  const tenNguoiBenh = String(params.ten_nguoi_benh || "").trim() || null;
  const boSungNb =
    params.bo_sung_nb === "1" ||
    params.bo_sung_nb === "true" ||
    Boolean(maBenhAn || maNguoiBenh || tenNguoiBenh);
  if (!bangKiemMa && !maBenhAn && !maNguoiBenh) return null;
  return { bangKiemMa, khoaId, maBenhAn, maNguoiBenh, tenNguoiBenh, boSungNb };
}
