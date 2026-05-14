/**
 * Trạng thái `fact_cong_viec.trang_thai` sau khi ghi nhận % tiến độ (báo cáo tiến độ).
 * 100% → chờ nghiệm thu (không tự HOAN_THANH).
 * Có báo cáo (kể cả 0%) → coi là đang thực hiện nếu đang ở cổng chờ nhận / chưa bắt đầu.
 */
export function trangThaiCongViecSauBaoCaoTienDo(phanTram: number, trangThaiHienTai?: string | null): string | null {
  if (phanTram >= 100) return "CHO_XAC_NHAN_HOAN_THANH";
  if (phanTram > 0) return "DANG_THUC_HIEN";
  const st = String(trangThaiHienTai || "");
  if (st === "CHUA_BAT_DAU" || st === "CHO_NHAN_VIEC") return "DANG_THUC_HIEN";
  return null;
}
