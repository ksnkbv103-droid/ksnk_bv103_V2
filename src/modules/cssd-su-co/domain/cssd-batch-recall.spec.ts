import { describe, expect, it } from "vitest";
import {
  buildBatchRecallAttributePatch,
  nextMachineStatusAfterBatchQcFail,
  recallTargetStationForLotMember,
  resolveBatchRecallReason,
  batchRecallReasonFromTypeId,
  BATCH_RECALL_REASON_OPTIONS,
  BATCH_RECALL_ENTRY_COPY,
} from "./cssd-batch-recall";

describe("cssd-batch-recall", () => {
  it("recalls issued sets back to Tiếp nhận", () => {
    expect(recallTargetStationForLotMember("CAP_PHAT")).toBe("TIEP_NHAN");
  });

  it("sends in-cycle sets to Đóng gói", () => {
    expect(recallTargetStationForLotMember("TIET_KHUAN")).toBe("DONG_GOI");
    expect(recallTargetStationForLotMember("DONG_GOI")).toBe("DONG_GOI");
    expect(recallTargetStationForLotMember("")).toBe("DONG_GOI");
  });

  it("holds READY machines at HOLD_QC and leaves REPAIRING", () => {
    expect(nextMachineStatusAfterBatchQcFail("READY")).toBe("HOLD_QC");
    expect(nextMachineStatusAfterBatchQcFail("HOAT_DONG")).toBe("HOLD_QC");
    expect(nextMachineStatusAfterBatchQcFail("REPAIRING")).toBeNull();
    expect(nextMachineStatusAfterBatchQcFail("HOLD_QC")).toBeNull();
  });

  it("stamps recall count and machine hold on attributes", () => {
    const p = buildBatchRecallAttributePatch({
      recalledCount: 4,
      machineHeld: true,
      machineId: "may-1",
    });
    expect(p.BATCH_RECALL).toBe("1");
    expect(p.BATCH_RECALL_COUNT).toBe("4");
    expect(p.MACHINE_HOLD_QC).toBe("1");
    expect(p.MACHINE_ID).toBe("may-1");
  });

  it("maps QT.24 reasons to existing PROCESS batch-QC type ids", () => {
    expect(BATCH_RECALL_REASON_OPTIONS).toHaveLength(3);
    expect(resolveBatchRecallReason("BI_POSITIVE").typeId).toBe("PROCESS_BI_POSITIVE");
    expect(resolveBatchRecallReason("WET_PACK").typeId).toBe("PROCESS_STERILIZATION_FAIL");
    expect(resolveBatchRecallReason("MACHINE_FAULT").typeId).toBe("PROCESS_STERILE_QC_FAIL");
    expect(resolveBatchRecallReason("unknown").code).toBe("BI_POSITIVE");
    expect(resolveBatchRecallReason("PROCESS_BI_POSITIVE").code).toBe("BI_POSITIVE");
    expect(resolveBatchRecallReason("PROCESS_STERILIZATION_FAIL").code).toBe("WET_PACK");
    expect(resolveBatchRecallReason("PROCESS_STERILE_QC_FAIL").code).toBe("MACHINE_FAULT");
  });

  it("round-trips typeId to reason and keeps D1 safety copy", () => {
    expect(batchRecallReasonFromTypeId("PROCESS_BI_POSITIVE")).toBe("BI_POSITIVE");
    expect(batchRecallReasonFromTypeId("PROCESS_STERILIZATION_FAIL")).toBe("WET_PACK");
    expect(batchRecallReasonFromTypeId("PROCESS_STERILE_QC_FAIL")).toBe("MACHINE_FAULT");
    expect(batchRecallReasonFromTypeId("PROCESS_QC_FAIL")).toBeNull();
    expect(BATCH_RECALL_ENTRY_COPY.title).toMatch(/Thu hồi/);
    expect(BATCH_RECALL_ENTRY_COPY.subtitle).toMatch(/không phải biến động dụng cụ/);
  });
});
