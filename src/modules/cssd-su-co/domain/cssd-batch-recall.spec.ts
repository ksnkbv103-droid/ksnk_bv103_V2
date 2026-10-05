import { describe, expect, it } from "vitest";
import {
  buildBatchRecallAttributePatch,
  nextMachineStatusAfterBatchQcFail,
  recallTargetStationForLotMember,
  resolveBatchRecallReason,
  batchRecallReasonFromTypeId,
  BATCH_RECALL_REASON_OPTIONS,
  BATCH_RECALL_ENTRY_COPY,
  isBatchRecallCommandPending,
  isCssdCycleUsedClinically,
  partitionRecallMembers,
  parseRecallMemberListText,
  selectBiRecallBatchIds,
  batchStatusAfterBiRecall,
} from "./cssd-batch-recall";

describe("cssd-batch-recall", () => {
  it("sends every recalled set to Tiếp nhận", () => {
    expect(recallTargetStationForLotMember("CAP_PHAT")).toBe("TIEP_NHAN");
    expect(recallTargetStationForLotMember("TIET_KHUAN")).toBe("TIEP_NHAN");
    expect(recallTargetStationForLotMember("DONG_GOI")).toBe("TIEP_NHAN");
    expect(recallTargetStationForLotMember("")).toBe("TIEP_NHAN");
  });

  it("lists clinically used sets (event) and recalls the rest — ma_ca_mo alone is not used", () => {
    expect(isCssdCycleUsedClinically({ maCaMoId: "CA-1" })).toBe(false);
    expect(
      isCssdCycleUsedClinically({
        usedClinically: true,
        usedClinicallyAt: "2026-09-28T01:00:00.000Z",
        usedClinicallyBy: "u1",
      }),
    ).toBe(true);
    const split = partitionRecallMembers([
      { id: "a", loId: "m1", maCaMoId: null, maBo: "B01" },
      { id: "b", loId: "m1", maCaMoId: "CA-9", maBo: "B02" },
      {
        id: "c",
        loId: "m1",
        maBo: "B03",
        usedClinically: true,
        usedClinicallyAt: "2026-09-28T01:00:00.000Z",
        usedClinicallyBy: "u1",
      },
    ]);
    expect(split.recall.map((row) => row.id)).toEqual(["a", "b"]);
    expect(split.listedOnly.map((row) => row.id)).toEqual(["c"]);
  });

  it("recalls from the batch after the latest prior BI-negative through the positive batch", () => {
    const batches = [
      { id: "b1", thietBiId: "may", at: "2026-09-01T01:00:00.000Z", trangThaiBi: "AM" },
      { id: "b2", thietBiId: "may", at: "2026-09-02T01:00:00.000Z", trangThaiBi: "CHUA_CO" },
      { id: "b3", thietBiId: "may", at: "2026-09-03T01:00:00.000Z", trangThaiBi: "AM" },
      { id: "b4", thietBiId: "may", at: "2026-09-04T01:00:00.000Z", trangThaiBi: "CHUA_CO" },
      { id: "b5", thietBiId: "may", at: "2026-09-05T01:00:00.000Z", trangThaiBi: "DUONG" },
      { id: "b6", thietBiId: "may", at: "2026-09-06T01:00:00.000Z", trangThaiBi: "CHUA_CO" },
      { id: "other", thietBiId: "may-khac", at: "2026-09-04T02:00:00.000Z", trangThaiBi: "CHUA_CO" },
    ];
    expect(selectBiRecallBatchIds(batches, "b5")).toEqual(["b4", "b5"]);
    expect(selectBiRecallBatchIds(batches, "b2")).toEqual(["b2"]);
    expect(selectBiRecallBatchIds(batches, "missing")).toEqual([]);
    expect(
      selectBiRecallBatchIds(
        [
          { id: "x", thietBiId: "may", at: "2026-09-01T00:00:00.000Z", trangThaiBi: "CHUA_CO" },
          { id: "y", thietBiId: "may", at: "2026-09-02T00:00:00.000Z", ketQuaBi: true },
          { id: "z", thietBiId: "may", at: "2026-09-03T00:00:00.000Z", trangThaiBi: "DUONG" },
        ],
        "z",
      ),
    ).toEqual(["z"]);
  });

  it("marks a released positive batch as recalled and an unreleased one as QC fail", () => {
    expect(batchStatusAfterBiRecall({ id: "b5", anchorId: "b5", trangThaiMe: "HOAN_THANH" })).toEqual({
      trangThaiMe: "THU_HOI",
      trangThaiBi: "DUONG",
    });
    expect(batchStatusAfterBiRecall({ id: "b5", anchorId: "b5", trangThaiMe: "CHO_BI" })).toEqual({
      trangThaiMe: "QC_KHONG_DAT",
      trangThaiBi: "DUONG",
    });
    expect(batchStatusAfterBiRecall({ id: "b4", anchorId: "b5", trangThaiMe: "HOAN_THANH" })).toEqual({
      trangThaiMe: "THU_HOI",
    });
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

  it("SC-02: nhận diện phiếu chờ ra lệnh thu hồi theo mẻ", () => {
    expect(
      isBatchRecallCommandPending({
        BATCH_RECALL_REQUESTED: "1",
        INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
        LO_TIET_KHUAN_ID: "lo-1",
      }),
    ).toBe(true);
    expect(
      isBatchRecallCommandPending({
        BATCH_RECALL_REQUESTED: "1",
        BATCH_RECALL: "1",
        INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
        LO_TIET_KHUAN_ID: "lo-1",
      }),
    ).toBe(false);
    expect(
      isBatchRecallCommandPending({
        BATCH_RECALL_REQUESTED: "1",
        INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
        LO_TIET_KHUAN_ID: "lo-1",
        INCIDENT_STATUS: "VO_HIEU",
      }),
    ).toBe(false);
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
    expect(BATCH_RECALL_ENTRY_COPY.subtitle).toMatch(/không phải Hỏng\/Mất/);
  });
});

describe("parseRecallMemberListText", () => {
  it("tách bộ về TN và bộ đã dùng", () => {
    const moved = parseRecallMemberListText("B01 (ME-1), B02 (ME-1)");
    expect(moved).toHaveLength(2);
    expect(moved[0]).toMatchObject({ maBo: "B01", maLo: "ME-1" });
    const mixed = parseRecallMemberListText("B01 (ME-1), B03 (ME-1, ca CA99)");
    expect(mixed).toHaveLength(2);
    expect(mixed[1]?.maBo).toBe("B03");
    expect(mixed[1]?.maCaMoId).toBe("CA99");
    expect(mixed[1]?.ghiChu).toMatch(/ca mổ/);
  });
});
