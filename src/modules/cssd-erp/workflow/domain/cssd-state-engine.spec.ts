/** Contract mirror — SSOT runtime: RPC `rpc_scan_workflow_station`. */
import { describe, expect, it } from "vitest";
import { validateStationAdvance } from "./cssd-state-engine";
import { nextWorkflowStation, previousWorkflowStation } from "./cssd-stations";

describe("cssd-state-engine", () => {
  it("blocks TIET_KHUAN as scan target", () => {
    expect(
      validateStationAdvance({ currentStatus: "DONG_GOI", targetStation: "TIET_KHUAN" }).ok,
    ).toBe(false);
  });

  it("allows shell (no station) to TIEP_NHAN", () => {
    expect(validateStationAdvance({ currentStatus: "", targetStation: "TIEP_NHAN" }).ok).toBe(true);
  });

  it("blocks advance from shell to LAM_SACH without TIEP_NHAN", () => {
    expect(validateStationAdvance({ currentStatus: "", targetStation: "LAM_SACH" }).ok).toBe(false);
  });

  it("allows sequential advance", () => {
    expect(validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "LAM_SACH" }).ok).toBe(true);
  });

  it("blocks duplicate TIEP_NHAN when already received", () => {
    expect(
      validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "TIEP_NHAN", tiepNhanPending: false }).ok,
    ).toBe(false);
  });

  it("allows idempotent TIEP_NHAN when reception pending", () => {
    expect(
      validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "TIEP_NHAN", tiepNhanPending: true }).ok,
    ).toBe(true);
  });

  it("blocks TIET_KHUAN to CAP_PHAT jump", () => {
    expect(validateStationAdvance({ currentStatus: "TIET_KHUAN", targetStation: "CAP_PHAT" }).ok).toBe(false);
  });

  it("allows new cycle from CAP_PHAT", () => {
    expect(
      validateStationAdvance({
        currentStatus: "CAP_PHAT",
        targetStation: "TIEP_NHAN",
        allowNewCycleFromCapPhat: true,
      }).ok,
    ).toBe(true);
  });

  it("rejects skipping a step", () => {
    expect(validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "QC" }).ok).toBe(false);
  });

  it("previousWorkflowStation", () => {
    expect(previousWorkflowStation("QC")).toBe("LAM_SACH");
    expect(previousWorkflowStation("TIEP_NHAN")).toBeNull();
  });

  it("nextWorkflowStation", () => {
    expect(nextWorkflowStation("QC")).toBe("DONG_GOI");
    expect(nextWorkflowStation("DONG_GOI")).toBe("TIET_KHUAN");
    expect(nextWorkflowStation("CAP_PHAT")).toBeNull();
  });
});
