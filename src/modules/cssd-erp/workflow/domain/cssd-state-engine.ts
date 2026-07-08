/**
 * Client/app mirror của luật chuyển trạm CSSD.
 * SSOT runtime: RPC `rpc_scan_workflow_station` (DB). Hàm `validateStationAdvance` dùng
 * pre-check app + contract test — giữ đồng bộ khi đổi luồng trạm.
 */
import type { Station } from "../../types/cssd.types";
import { WORKFLOW_STEPS, previousWorkflowStation, stepIndex } from "./cssd-stations";

export type AdvanceContext = {
  /** Rỗng = shell chưa vào trạm (bootstrap catalog). */
  currentStatus: Station | "";
  targetStation: Station;
  allowNewCycleFromCapPhat?: boolean;
  /** TIEP_NHAN chưa có thoi_gian_tiep_nhan — cho phép xác nhận idempotent (legacy bootstrap). */
  tiepNhanPending?: boolean;
};

export function isValidStation(value: string): value is Station {
  return (WORKFLOW_STEPS as readonly string[]).includes(value);
}

export function validateStationAdvance(ctx: AdvanceContext): { ok: true } | { ok: false; message: string } {
  const { currentStatus, targetStation, allowNewCycleFromCapPhat = true, tiepNhanPending = false } = ctx;
  const current = String(currentStatus || "").trim() as Station | "";

  if (targetStation === "TIET_KHUAN") {
    return {
      ok: false,
      message:
        "Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào CSSD → tab Mẻ tiệt khuẩn (/cssd-quy-trinh?tab=batch): tạo phiếu, rồi quét QR bộ trong màn hình mẻ.",
    };
  }

  if (!current) {
    if (targetStation === "TIEP_NHAN") return { ok: true };
    return {
      ok: false,
      message: "Bộ chưa tiếp nhận — quét tại trạm Tiếp nhận trước.",
    };
  }

  if (current === "TIEP_NHAN" && targetStation === "TIEP_NHAN") {
    if (tiepNhanPending) return { ok: true };
    return {
      ok: false,
      message: "Bộ đã tiếp nhận — chuyển sang Làm sạch.",
    };
  }

  const curIdx = stepIndex(current);
  const tgtIdx = stepIndex(targetStation);
  if (curIdx < 0 || tgtIdx < 0) {
    return { ok: false, message: `Trạng thái không hợp lệ: ${current} → ${targetStation}` };
  }

  const loopBack = allowNewCycleFromCapPhat && targetStation === "TIEP_NHAN" && current === "CAP_PHAT";
  if (loopBack) return { ok: true };

  if (tgtIdx !== curIdx + 1) {
    return {
      ok: false,
      message: `Sai trạm! Quy trình đang ở bước ${current}`,
    };
  }

  if (targetStation === "CAP_PHAT" && current === "TIET_KHUAN") {
    return {
      ok: false,
      message:
        "Bộ đang ở tiệt khuẩn: không quét Cấp phát tại đây. Mở trang Mẻ tiệt khuẩn (CSSD → Mẻ tiệt khuẩn), tạo hoặc mở phiếu mẻ, quét QR đưa bộ vào mẻ, rồi kết thúc mẻ với đủ thông số QC — hệ thống mới chuyển sang Cấp phát và ghi truy vết.",
    };
  }

  return { ok: true };
}

export { previousWorkflowStation };
