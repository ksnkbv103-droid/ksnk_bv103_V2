/** Việc định kỳ: tick đủ / báo 100% thì đóng — không qua cổng nghiệm thu. */

export function isQlcvLoaiDinhKy(loaiCongViec?: string | null): boolean {
  return loaiCongViec === "DINH_KY";
}

export function shouldAutoHoanThanhDinhKy(input: {
  loai_cong_viec?: string | null;
  phan_tram: number;
}): boolean {
  return isQlcvLoaiDinhKy(input.loai_cong_viec) && input.phan_tram >= 100;
}
