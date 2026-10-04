/**
 * GS-01 — validator chung 6 chiều phiên (VST + GSC).
 * khoa → khu vực → vị trí → loại đối tượng → tên đối tượng (khi NV) → gan_nb.
 */

export type GiamSatDoiTuongLoai =
  | "NHAN_VIEN"
  | "NGUOI_BENH"
  | "MOI_TRUONG"
  | "THIET_BI"
  | "ME_TIET_KHUAN"
  | string;

export type SixSessionDimensionsInput = {
  khoa_id?: string | null;
  khu_vuc_id?: string | null;
  vi_tri?: string | null;
  /** GSC: từ BK; VST: cố định NHAN_VIEN. */
  doi_tuong_loai?: GiamSatDoiTuongLoai | null;
  nhan_vien_id?: string | null;
  is_manual_nhan_vien?: boolean | null;
  ten_manual_nhan_vien?: string | null;
  /** VST: tên ngoài danh mục. */
  ten_nhan_vien_ngoai?: string | null;
  /** gan_nb — bool bắt buộc ghi. */
  gan_nb?: boolean | null;
};

function trimOrEmpty(v: unknown): string {
  return String(v ?? "").trim();
}

/** Kiểm tra 6 chiều — trả về thông báo tiếng Việt hoặc null nếu hợp lệ. */
export function validateSixSessionDimensions(input: SixSessionDimensionsInput): string | null {
  if (!trimOrEmpty(input.khoa_id)) {
    return "Vui lòng chọn Khoa.";
  }
  if (!trimOrEmpty(input.khu_vuc_id)) {
    return "Vui lòng chọn Khu vực giám sát.";
  }
  if (!trimOrEmpty(input.vi_tri)) {
    return "Vui lòng nhập Vị trí giám sát.";
  }
  if (typeof input.gan_nb !== "boolean") {
    return "Thiếu trạng thái bổ sung người bệnh (gan_nb).";
  }

  const loai = trimOrEmpty(input.doi_tuong_loai).toUpperCase();
  if (loai === "NHAN_VIEN") {
    const nvId = trimOrEmpty(input.nhan_vien_id);
    const isManual = Boolean(input.is_manual_nhan_vien);
    const tenManual = trimOrEmpty(input.ten_manual_nhan_vien);
    const tenNgoai = trimOrEmpty(input.ten_nhan_vien_ngoai);
    if (isManual || tenNgoai) {
      if (!tenManual && !tenNgoai) {
        return "Đối tượng ngoài danh mục: vui lòng nhập tên nhân viên.";
      }
      return null;
    }
    if (!nvId) {
      return "Vui lòng chọn nhân viên giám sát hoặc bật «Ngoài danh mục» và nhập tên.";
    }
  }
  return null;
}

/** VST: từng cột quan sát phải có tên NV (MDM hoặc ngoài danh mục). */
export function validateVstObservationNhanVien(obs: {
  nhan_vien_id?: string | null;
  ten_nhan_vien_ngoai?: string | null;
}): string | null {
  const nvId = trimOrEmpty(obs.nhan_vien_id);
  const tenNgoai = trimOrEmpty(obs.ten_nhan_vien_ngoai);
  if (!nvId && !tenNgoai) {
    return "Vui lòng chọn nhân viên hoặc nhập tên ngoài danh mục.";
  }
  return null;
}
