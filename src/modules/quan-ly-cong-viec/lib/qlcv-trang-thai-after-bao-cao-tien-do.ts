/**
 * Trạng thái `fact_cong_viec.trang_thai` sau khi ghi nhận % tiến độ (báo cáo tiến độ).
 * 100% → chờ nghiệm thu (không tự HOAN_THANH).
 * Có báo cáo (kể cả 0%) → coi là đang làm nếu đang ở cổng chờ nhận / mới / từ chối nghiệm thu.
 */
export function trangThaiCongViecSauBaoCaoTienDo(phanTram: number, trangThaiHienTai?: string | null): string | null {
  if (phanTram >= 100) return "CHO_DUYET";
  if (phanTram > 0) return "DANG_LAM";
  const st = String(trangThaiHienTai || "");
  if (st === "MOI" || st === "TU_CHOI" || st === "CHUA_BAT_DAU" || st === "CHO_NHAN_VIEC") return "DANG_LAM";
  return null;
}
