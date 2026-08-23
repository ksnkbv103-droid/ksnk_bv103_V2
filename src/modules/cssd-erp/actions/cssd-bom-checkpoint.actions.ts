"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import type { Station } from "../types/cssd.types";
import { validateStationAdvance } from "../workflow/domain/cssd-state-engine";
import { isRejectedLegacyHexBoQr } from "@/lib/domain/cssd-bo-ma";

/** Xác thực mã QR trước khi mở thẻ bộ tại trạm Đóng gói. */
export async function prepareDongGoiBomGateScan(
  maQR: string,
  opts?: { edit?: boolean },
) {
  if (opts?.edit !== false) {
    await verifyPermission("CSSD_WORKFLOW", "edit");
  } else {
    await verifyPermission("CSSD_WORKFLOW", "view");
  }

  const supabase = createAdminSupabaseClient();
  const resolved = await resolveCssdCodeWithClient(supabase, maQR);
  if (isRejectedLegacyHexBoQr(resolved.code)) {
    throw new Error(
      `Mã ${resolved.code} là tem hex cũ — không còn hỗ trợ. In lại tem mã bộ từ danh mục CSSD.`,
    );
  }
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy — dùng màn Bảo trì thiết bị hoặc Mẻ tiệt khuẩn.");
  }
  if (resolved.targetType === "STERILIZATION_BATCH") {
    throw new Error(
      `Mã ${resolved.code} là mã mẻ tiệt khuẩn — dùng tab Truy vết, không quét tại trạm workflow.`,
    );
  }

  const qt = await fetchActiveQuyTrinhByScanCode(supabase, resolved.code);
  if (!qt?.id) {
    throw new Error(`Không tìm thấy quy trình đang hoạt động cho mã ${resolved.code}.`);
  }

  const currentStatus = String(qt.ma_trang_thai_hien_tai || "").trim() as Station | "";
  const tiepNhanPending =
    currentStatus === "TIEP_NHAN" && !String(qt.thoi_gian_tiep_nhan || "").trim();
  const advance = validateStationAdvance({
    currentStatus,
    targetStation: "DONG_GOI",
    tiepNhanPending,
  });
  if (!advance.ok) throw new Error(advance.message);

  if (qt.is_dong_bang === true) {
    throw new Error("Bộ dụng cụ đang bị khóa an toàn — không thể đóng gói.");
  }

  const boDungCuId = String(qt.bo_dung_cu_id || "").trim();
  if (!boDungCuId) {
    throw new Error("Quy trình chưa gán bộ dụng cụ — không thể mở bảng kiểm cấu phần.");
  }

  return {
    success: true as const,
    code: resolved.code,
    quyTrinhId: String(qt.id),
    boDungCuId,
    tenBoDungCu: String(qt.ten_bo || resolved.code),
    maTrangThaiHienTai: currentStatus,
  };
}
