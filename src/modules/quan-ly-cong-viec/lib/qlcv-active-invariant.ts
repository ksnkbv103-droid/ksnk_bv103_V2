/**
 * Invariant phiếu active (Lock A): tiêu đề + người phụ trách + hạn (DOT/KHAN; DINH_KY cũng không xóa hạn).
 */

export type QlcvActiveInvariantInput = {
  tieu_de?: string | null;
  nguoi_phu_trach_id?: string | null;
  han_hoan_thanh?: string | null;
  loai_cong_viec?: string | null;
};

export function assertQlcvActiveInvariant(input: QlcvActiveInvariantInput): void {
  const tieu = String(input.tieu_de ?? "").trim();
  if (!tieu) throw new Error("Thiếu tiêu đề công việc.");

  if (!input.nguoi_phu_trach_id) {
    throw new Error("Chọn người phụ trách.");
  }

  const loai = String(input.loai_cong_viec ?? "DOT_XUAT").toUpperCase();
  const han = input.han_hoan_thanh ? String(input.han_hoan_thanh).trim() : "";
  if (!han) {
    if (loai === "DINH_KY") {
      throw new Error("Việc định kỳ phải có hạn (ngày kỳ) — không được xóa hạn.");
    }
    throw new Error("Hạn hoàn thành bắt buộc trước khi giao việc.");
  }
}
