import { describe, expect, it } from "vitest";
import {
  buildBatchRecallAttributePatch,
  nextMachineStatusAfterBatchQcFail,
  recallTargetStationForLotMember,
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
});
