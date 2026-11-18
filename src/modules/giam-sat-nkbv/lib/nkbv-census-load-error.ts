/**
 * NKBV-037: lỗi tải danh sách BN (bị chặn quyền, chưa gán khoa, lỗi DB) phải hiện là lỗi,
 * không được rơi vào câu «không có BN» như khoa thật sự không có ca.
 */

/** Gộp lỗi các nhánh tải song song thành một câu, bỏ trùng — để chỉ một toast/một dòng. */
export function gopLoiTaiCensus(...loi: Array<string | null | undefined>): string | null {
  const cau = [...new Set(loi.map((s) => String(s ?? "").trim()).filter(Boolean))];
  return cau.length ? cau.join(" · ") : null;
}

/** Dòng đầu ô chọn BN theo khoa (form GSC). */
export function goiYChonBnTheoKhoa(o: {
  coKhoa: boolean;
  dangTai: boolean;
  soBn: number;
  locMdro: boolean;
  loiTai: string | null;
}): string {
  if (!o.coKhoa) return "Chọn khoa ở khung trên trước…";
  if (o.dangTai) return "Đang tải danh sách…";
  if (o.loiTai) return "Không tải được danh sách BN — nhập tay bên dưới";
  if (o.soBn) return o.locMdro ? "— Chọn BN đa kháng còn nằm viện —" : "— Chọn BN còn nằm viện (hoặc nhập tay bên dưới) —";
  return o.locMdro ? "Không có BN đa kháng còn nằm tại khoa" : "Không có BN còn nằm viện tại khoa — nhập tay bên dưới";
}
