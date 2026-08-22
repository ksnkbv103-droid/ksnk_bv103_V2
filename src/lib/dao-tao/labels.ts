/** Nhãn tiếng Việt cho UI Đào tạo — không đổi mã lưu DB. */

export const LOAI_CAU_LABEL: Record<string, string> = {
  single: "Chọn một",
  multi: "Chọn nhiều",
  true_false_cluster: "Đúng / Sai",
  order: "Sắp xếp",
};

export function labelLoaiCau(loai: string): string {
  return LOAI_CAU_LABEL[loai] ?? loai;
}

export const TRANG_THAI_KY_LABEL: Record<string, string> = {
  draft: "Nháp",
  published: "Đang mở",
  closed: "Đã kết thúc",
};

export function labelTrangThaiKy(trangThai: string): string {
  return TRANG_THAI_KY_LABEL[trangThai] ?? trangThai;
}

export const CHE_DO_THI_LABEL: Record<string, string> = {
  thi_thu: "Ôn tập",
  thi_that: "Thi chính thức",
};

export function labelCheDoThi(cheDo: string): string {
  return CHE_DO_THI_LABEL[cheDo] ?? cheDo;
}

export function parseGan(gan: unknown): { khoa_ids: string[]; nhan_su_ids: string[] } {
  const g = (gan ?? {}) as { khoa_ids?: string[]; nhan_su_ids?: string[] };
  return {
    khoa_ids: Array.isArray(g.khoa_ids) ? g.khoa_ids.filter(Boolean) : [],
    nhan_su_ids: Array.isArray(g.nhan_su_ids) ? g.nhan_su_ids.filter(Boolean) : [],
  };
}
