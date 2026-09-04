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

/** Lý do thu hồi theo mẻ (QT.24) — map sang typeId PROCESS hiện có, không invent schema. */
export const BATCH_RECALL_REASON_CODES = ["BI_POSITIVE", "WET_PACK", "MACHINE_FAULT"] as const;
export type BatchRecallReasonCode = (typeof BATCH_RECALL_REASON_CODES)[number];

export type BatchRecallReasonOption = {
  code: BatchRecallReasonCode;
  label: string;
  typeId: string;
  typeTen: string;
  hint: string;
};

export const BATCH_RECALL_REASON_OPTIONS: readonly BatchRecallReasonOption[] = [
  {
    code: "BI_POSITIVE",
    label: "BI dương tính (BI+)",
    typeId: "PROCESS_BI_POSITIVE",
    typeTen: "Chỉ thị sinh học (BI) dương tính",
    hint: "Thu hồi mọi bộ cùng mẻ; máy sẵn sàng → HOLD_QC.",
  },
  {
    code: "WET_PACK",
    label: "Gói ướt / bao bì không đạt",
    typeId: "PROCESS_STERILIZATION_FAIL",
    typeTen: "Chất lượng tiệt khuẩn / mẻ không đạt",
    hint: "Gói ướt = bẩn (PCI) — thu hồi theo mẻ, không cấp phát.",
  },
  {
    code: "MACHINE_FAULT",
    label: "Lỗi máy / thông số bất thường",
    typeId: "PROCESS_STERILE_QC_FAIL",
    typeTen: "Nội kiểm mẻ TK hoặc Bowie-Dick không đạt",
    hint: "QC mẻ / máy không đạt — thu hồi + tạm giữ QC.",
  },
] as const;

/** Copy D1: thu hồi = sự cố an toàn, không lẫn 3 cửa biến động dụng cụ. */
export const BATCH_RECALL_ENTRY_COPY = {
  title: "Thu hồi theo mẻ",
  subtitle:
    "Sự cố an toàn (QT.24) — không phải biến động dụng cụ (Đổi danh mục · Hỏng/Mất · Chuyển).",
  effect:
    "Mọi bộ cùng mã lô: đã cấp phát → Tiếp nhận; còn trong chu trình → Đóng gói (+ đóng băng). Máy sẵn sàng → HOLD_QC.",
} as const;

export function resolveBatchRecallReason(codeOrTypeId?: string | null): BatchRecallReasonOption {
  const raw = String(codeOrTypeId || "").trim().toUpperCase();
  const byCode = BATCH_RECALL_REASON_OPTIONS.find((x) => x.code === raw);
  if (byCode) return byCode;
  const byType = BATCH_RECALL_REASON_OPTIONS.find((x) => x.typeId === raw);
  if (byType) return byType;
  return BATCH_RECALL_REASON_OPTIONS[0];
}

/** Map typeId PROCESS → lý do thu hồi (deep-link / prefill). */
export function batchRecallReasonFromTypeId(typeId?: string | null): BatchRecallReasonCode | null {
  const code = String(typeId || "").trim().toUpperCase();
  if (code === "PROCESS_BI_POSITIVE") return "BI_POSITIVE";
  if (code === "PROCESS_STERILE_QC_FAIL") return "MACHINE_FAULT";
  if (code === "PROCESS_STERILIZATION_FAIL") return "WET_PACK";
  return null;
}
