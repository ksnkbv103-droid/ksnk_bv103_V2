/**
 * SC-10: BI+ / QC mẻ không đạt → thu hồi mọi bộ cùng `lo_tiet_khuan_id`.
 * Bộ đã cấp phát: quay Tiếp nhận. Bộ còn trong chu trình: về Đóng gói (khớp luật QC mẻ).
 */

export function recallTargetStationForLotMember(currentStation: string | null | undefined): "TIEP_NHAN" | "DONG_GOI" {
  const st = String(currentStation || "").trim().toUpperCase();
  if (st === "CAP_PHAT") return "TIEP_NHAN";
  return "DONG_GOI";
}

/** Chỉ chuyển máy đang sẵn sàng → HOLD_QC. Không đè REPAIRING / đã HOLD_QC. */
export function nextMachineStatusAfterBatchQcFail(currentStatus: string | null | undefined): "HOLD_QC" | null {
  const st = String(currentStatus || "").trim().toUpperCase();
  if (st === "READY" || st === "HOAT_DONG" || !st) return "HOLD_QC";
  return null;
}

export function buildBatchRecallAttributePatch(args: {
  recalledCount: number;
  machineHeld: boolean;
  machineId?: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {
    BATCH_RECALL: "1",
    BATCH_RECALL_COUNT: String(Math.max(0, args.recalledCount)),
    MACHINE_HOLD_QC: args.machineHeld ? "1" : "0",
  };
  const machineId = String(args.machineId || "").trim();
  if (machineId) out.MACHINE_ID = machineId;
  return out;
}
