/**
 * Mẻ không đạt / BI+: bộ chưa dùng lâm sàng về Tiếp nhận (dụng cụ bẩn), không về Đóng gói.
 * Tham số trạm giữ để chỗ gọi cũ không đổi chữ ký; đích không còn phụ thuộc trạm hiện tại.
 */

export function recallTargetStationForLotMember(_currentStation?: string | null): "TIEP_NHAN" {
  return "TIEP_NHAN";
}

/** Đã dùng lâm sàng khi chu kỳ có mã ca mổ. Không có hàm khác trên base. */
export function isCssdCycleUsedClinically(input: { maCaMoId?: string | null }): boolean {
  return String(input.maCaMoId || "").trim().length > 0;
}

export type BatchRecallMember = {
  id: string;
  maBo?: string | null;
  tenBo?: string | null;
  maCaMoId?: string | null;
  loId: string;
  maLo?: string | null;
};

/** Bộ đã dùng: chỉ liệt kê. Bộ còn lại: thu hồi về Tiếp nhận. */
export function partitionRecallMembers(members: readonly BatchRecallMember[]): {
  recall: BatchRecallMember[];
  listedOnly: BatchRecallMember[];
} {
  const recall: BatchRecallMember[] = [];
  const listedOnly: BatchRecallMember[] = [];
  for (const member of members) {
    if (isCssdCycleUsedClinically(member)) listedOnly.push(member);
    else recall.push(member);
  }
  return { recall, listedOnly };
}

export type BiRecallBatch = {
  id: string;
  thietBiId: string;
  /** Mốc thời gian so được (ISO). */
  at: string;
  trangThaiBi?: string | null;
  ketQuaBi?: boolean | null;
};

/** BI âm: cột `AM`, hoặc dữ liệu cũ chỉ có `ket_qua_bi = true`. */
export function isBiAmBatch(batch: BiRecallBatch): boolean {
  const bi = String(batch.trangThaiBi || "").trim().toUpperCase();
  if (bi === "AM") return true;
  if (bi === "DUONG" || bi === "CHUA_CO") return false;
  return batch.ketQuaBi === true;
}

/**
 * Phạm vi BI+: cùng máy, sau mẻ BI âm gần nhất (mốc, không thu hồi) đến hết mẻ dương.
 * Không có mốc âm → mọi mẻ cùng máy đến hết mẻ dương. Không lấy mẻ chạy sau mẻ dương.
 */
export function selectBiRecallBatchIds(batches: readonly BiRecallBatch[], anchorId: string): string[] {
  const anchorKey = String(anchorId || "").trim();
  const anchor = batches.find((batch) => batch.id === anchorKey);
  if (!anchor) return [];
  const machine = String(anchor.thietBiId || "").trim();
  const same = batches.filter((batch) => String(batch.thietBiId || "").trim() === machine);
  const sorted = [...same].sort((a, b) => {
    const byTime = String(a.at || "").localeCompare(String(b.at || ""));
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  const anchorIdx = sorted.findIndex((batch) => batch.id === anchorKey);
  if (anchorIdx < 0) return [];
  let lastAm = -1;
  for (let i = 0; i < anchorIdx; i += 1) {
    if (isBiAmBatch(sorted[i])) lastAm = i;
  }
  return sorted.slice(lastAm + 1, anchorIdx + 1).map((batch) => batch.id);
}

/** Mẻ dương đã nhả → THU_HOI. Mẻ dương chưa nhả → QC_KHONG_DAT. Mẻ khác trong cửa sổ → THU_HOI. */
export function batchStatusAfterBiRecall(input: {
  id: string;
  anchorId: string;
  trangThaiMe?: string | null;
}): { trangThaiMe: "QC_KHONG_DAT" | "THU_HOI"; trangThaiBi?: "DUONG" } {
  if (input.id === input.anchorId) {
    const released = String(input.trangThaiMe || "").trim().toUpperCase() === "HOAN_THANH";
    return {
      trangThaiMe: released ? "THU_HOI" : "QC_KHONG_DAT",
      trangThaiBi: "DUONG",
    };
  }
  return { trangThaiMe: "THU_HOI" };
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
    hint: "Thu hồi các mẻ cùng máy từ sau BI âm gần nhất; bộ chưa dùng về Tiếp nhận.",
  },
  {
    code: "WET_PACK",
    label: "Gói ướt / bao bì không đạt",
    typeId: "PROCESS_STERILIZATION_FAIL",
    typeTen: "Chất lượng tiệt khuẩn / mẻ không đạt",
    hint: "Gói ướt = bẩn — thu hồi cả mẻ về Tiếp nhận, không cấp phát.",
  },
  {
    code: "MACHINE_FAULT",
    label: "Lỗi máy / thông số bất thường",
    typeId: "PROCESS_STERILE_QC_FAIL",
    typeTen: "Nội kiểm mẻ TK hoặc Bowie-Dick không đạt",
    hint: "QC mẻ không đạt — thu hồi về Tiếp nhận và tạm giữ máy.",
  },
] as const;

/** Copy D1: thu hồi = sự cố an toàn, không lẫn 3 cửa biến động dụng cụ. */
export const BATCH_RECALL_ENTRY_COPY = {
  title: "Thu hồi theo mẻ",
  subtitle: "Sự cố an toàn — không phải biến động dụng cụ (Hỏng/Mất · Chuyển).",
  effect:
    "Bộ chưa dùng lâm sàng về Tiếp nhận để xử lý lại như dụng cụ bẩn. Bộ đã dùng chỉ được liệt kê. Máy sẵn sàng → HOLD_QC.",
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
