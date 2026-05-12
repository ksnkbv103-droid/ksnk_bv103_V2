import type { Station } from "../../types/cssd.types";
import { WORKFLOW_STEPS, previousWorkflowStation, stepIndex } from "./cssd-stations";

export type AdvanceContext = {
  currentStatus: Station;
  targetStation: Station;
  allowNewCycleFromCapPhat?: boolean;
};

export function isValidStation(value: string): value is Station {
  return (WORKFLOW_STEPS as readonly string[]).includes(value);
}

export function validateStationAdvance(ctx: AdvanceContext): { ok: true } | { ok: false; message: string } {
  const { currentStatus, targetStation, allowNewCycleFromCapPhat = true } = ctx;

  if (targetStation === "TIET_KHUAN") {
    return {
      ok: false,
      message:
        "Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào CSSD → Mẻ tiệt khuẩn (/cssd-erp/batch): tạo phiếu, rồi quét QR bộ trong màn hình mẻ.",
    };
  }

  const curIdx = stepIndex(currentStatus);
  const tgtIdx = stepIndex(targetStation);
  if (curIdx < 0 || tgtIdx < 0) {
    return { ok: false, message: `Trạng thái không hợp lệ: ${currentStatus} → ${targetStation}` };
  }

  const loopBack = allowNewCycleFromCapPhat && targetStation === "TIEP_NHAN" && currentStatus === "CAP_PHAT";
  if (loopBack) return { ok: true };

  if (tgtIdx !== curIdx + 1) {
    return {
      ok: false,
      message: `Sai trạm! Quy trình đang ở bước ${currentStatus}`,
    };
  }

  if (targetStation === "CAP_PHAT" && currentStatus === "TIET_KHUAN") {
    return {
      ok: false,
      message:
        "Bộ đang ở tiệt khuẩn: không quét Cấp phát tại đây. Mở trang Mẻ tiệt khuẩn (CSSD → Mẻ tiệt khuẩn), tạo hoặc mở phiếu mẻ, quét QR đưa bộ vào mẻ, rồi kết thúc mẻ với đủ thông số QC — hệ thống mới chuyển sang Cấp phát và ghi truy vết.",
    };
  }

  return { ok: true };
}

export function lifecycleEventCodeForAdvance(targetStation: Station): string {
  const map: Partial<Record<Station, string>> = {
    LAM_SACH: "BAT_DAU_LAM_SACH",
    QC: "HOAN_QC",
    DONG_GOI: "HOAN_DONG_GOI",
    CAP_PHAT: "XAC_NHAN_CAP_PHAT",
    TIEP_NHAN: "TIEP_NHAN_CHU_KY_MOI",
  };
  return map[targetStation] || `CHUYEN_TRAM_${targetStation}`;
}

export { previousWorkflowStation };
