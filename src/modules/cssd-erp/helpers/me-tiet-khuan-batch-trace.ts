import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "../actions/cssd-action-common";

/**
 * Vào mẻ chỉ qua /cssd-erp/batch — không quét trạm TK trên trang 6 bước.
 * Chỉ bộ **ĐÓNG GÓI** (chưa gắn mẻ khác) mới được quét vào phiếu mẻ mới.
 * Bộ đã `TIET_KHUAN` chỉ hợp lệ khi đã có `lo_tiet_khuan_id` (đã trong một mẻ).
 */
export function getBatchAddRejectionReason(
  qt: { trang_thai_hien_tai?: string; lo_tiet_khuan_id?: string | null; is_dong_bang?: boolean | null },
  batchId: string,
  opts?: { batchLocked?: boolean },
): string | null {
  if (opts?.batchLocked === true) {
    return "Đã xác nhận bắt đầu tiệt khuẩn — không thể nạp thêm bộ vào mẻ này.";
  }
  if (qt.is_dong_bang === true) {
    return "Bộ đang bị khóa an toàn (đóng băng) — cần quản trị mở khóa trước khi đưa vào mẻ tiệt khuẩn.";
  }
  const bid = String(batchId || "").trim();
  const loRaw = qt.lo_tiet_khuan_id;
  const lo = loRaw != null && String(loRaw).trim() !== "" ? String(loRaw).trim() : null;
  const st = String(qt.trang_thai_hien_tai || "").trim();

  if (lo === bid) return "Bộ đã có trong phiếu/mẻ tiệt khuẩn này.";
  if (lo && lo !== bid) return "Bộ đã gắn mẻ tiệt khuẩn khác — không thể thêm vào mẻ này.";

  if (st === "TIET_KHUAN" && !lo) {
    return (
      "Bộ đang hiển thị trạng thái tiệt khuẩn nhưng không có phiếu mẻ trên hệ thống — không quét được vào mẻ." +
      " Liên hệ KSNK kiểm tra dữ liệu; không tạo phiếu mới bằng quét tại trang 6 trạm."
    );
  }

  if (st !== "DONG_GOI") {
    return `Chỉ đưa bộ vào phiếu khi đang ở ĐÓNG GÓI. Hiện tại: ${st || "—"}.`;
  }

  return null;
}

/** Ghi nhật ký: bộ được đưa vào phiếu/mẻ TK (phục vụ truy vết khi sự cố). */
export async function logQuyTrinhVaoMeTietKhuan(
  supabase: SupabaseClient,
  p: { quyTrinhId: string; maVachQr: string; maLo: string; nguoiThucHien: string },
): Promise<string | null> {
  try {
    await appendQuyTrinhException(supabase, p.quyTrinhId, {
      su_kien: "VAO_ME_TIET_KHUAN",
      tu_tram: "DONG_GOI",
      den_tram: "TIET_KHUAN",
      ly_do: `Phiếu TK ${p.maLo}: nhận bộ ${p.maVachQr} vào mẻ`,
      nguoi_thao_tac: p.nguoiThucHien,
    });
    return null;
  } catch (err: any) {
    return err.message || "Lỗi ghi nhận lịch sử vào mẻ.";
  }
}
