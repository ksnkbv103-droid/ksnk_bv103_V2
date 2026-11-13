/**
 * Sửa/xóa muộn phiên VST phải qua yêu cầu chờ chủ nhiệm khoa duyệt.
 * @dac-ta R1.24, R1.25
 * Giả định (đặc tả ghi «cơ chế là giả định»): «đã xác nhận» trong app = quá 30 phút kể từ lúc tạo phiên.
 */
export type VstDuongDieuChinh = "TRUC_TIEP" | "YEU_CAU" | "TU_CHOI";

export type VstLoaiYeuCau = "XOA" | "SUA";

/** Vai trò được coi là cán bộ KSNK (CB_KSNK của đặc tả) khi tạo yêu cầu cho phiên không phải của mình. */
export const VST_VAI_TRO_CAN_BO_KSNK = ["NHAN_VIEN_KSNK", "CHU_NHIEM_KHOA"] as const;

export function quyetDinhDuongDieuChinhVst(p: {
  adminBypass: boolean;
  laChuPhien: boolean;
  quaHan: boolean;
  laCanBoKsnk: boolean;
}): VstDuongDieuChinh {
  if (p.adminBypass) return "TRUC_TIEP";
  if (p.laChuPhien && !p.quaHan) return "TRUC_TIEP";
  if (p.laChuPhien || p.laCanBoKsnk) return "YEU_CAU";
  return "TU_CHOI";
}

/** Người tạo yêu cầu không tự duyệt; chỉ miễn ADMIN (cùng mẫu QLCV-010). */
export function duocDuyetYeuCauVst(p: {
  nguoiDuyetAuthId: string | null;
  nguoiYeuCauAuthId: string | null;
  laAdmin: boolean;
}): boolean {
  if (!p.nguoiDuyetAuthId) return false;
  if (p.laAdmin) return true;
  return p.nguoiDuyetAuthId !== p.nguoiYeuCauAuthId;
}
