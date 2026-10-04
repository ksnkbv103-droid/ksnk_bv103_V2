/**
 * QLCV-07: xóa cứng chỉ đề xuất chưa duyệt hoặc phiếu trống (% = 0, nhật ký tối đa 1 dòng tạo).
 * Còn lại dùng Hủy.
 */

import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isDeXuatChoDuyet } from "./qlcv-workflow-display";
import { parseQlcvNhatKy } from "./qlcv-nhat-ky";

export type QlcvHardDeleteRow = {
  trang_thai?: string | null;
  is_active?: boolean | null;
  phan_tram_hoan_thanh?: number | null;
  nhat_ky?: unknown;
  nguoi_phu_trach_id?: string | null;
};

export function canQlcvHardDelete(row: QlcvHardDeleteRow): boolean {
  if (isDeXuatChoDuyet(row)) return true;

  const st = normalizeQlcvTrangThaiToCanonical(row.trang_thai);
  if (st === "HOAN_THANH" || st === "CHO_DUYET" || st === "DA_HUY" || st === "QUA_HAN") {
    return false;
  }
  if (st !== "MOI" && st !== "DANG_LAM" && st !== "TU_CHOI") return false;

  const pct = Number(row.phan_tram_hoan_thanh ?? 0);
  if (pct > 0) return false;

  const nk = parseQlcvNhatKy(row.nhat_ky);
  if (nk.length > 1) return false;
  return true;
}

export function assertQlcvHardDeleteAllowed(row: QlcvHardDeleteRow): void {
  if (canQlcvHardDelete(row)) return;
  throw new Error("Không xóa cứng được — dùng Hủy (giữ nhật ký và báo cáo kỳ).");
}
