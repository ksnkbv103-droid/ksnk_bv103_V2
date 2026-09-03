/**
 * Trạng thái `qlcv_fact_cong_viec.trang_thai` sau khi ghi nhận % tiến độ.
 * Định kỳ 100% → HOAN_THANH. Đột xuất/khẩn 100% → CHO_DUYET (chờ nghiệm thu).
 */

import { shouldAutoHoanThanhDinhKy } from "@/lib/domain/qlcv/dinh-ky-auto-complete";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";

export function trangThaiCongViecSauBaoCaoTienDo(
  phanTram: number,
  trangThaiHienTai?: string | null,
  loaiCongViec?: string | null,
): string | null {
  if (phanTram >= 100) {
    return shouldAutoHoanThanhDinhKy({ loai_cong_viec: loaiCongViec, phan_tram: phanTram })
      ? "HOAN_THANH"
      : "CHO_DUYET";
  }
  if (phanTram > 0) return "DANG_LAM";
  const st = normalizeQlcvTrangThaiToCanonical(trangThaiHienTai);
  if (st === "MOI" || st === "TU_CHOI") return "DANG_LAM";
  return null;
}
