import { describe, expect, it } from "vitest";
import { validateStationAdvance } from "./cssd-state-engine";
import { previousWorkflowStation } from "./cssd-stations";

describe("cssd-state-engine", () => {
  it("blocks TIET_KHUAN as scan target", () => {
    expect(
      validateStationAdvance({ currentStatus: "DONG_GOI", targetStation: "TIET_KHUAN" }).ok,
    ).toBe(false);
  });

  it("allows sequential advance", () => {
    expect(validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "LAM_SACH" }).ok).toBe(true);
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
});
