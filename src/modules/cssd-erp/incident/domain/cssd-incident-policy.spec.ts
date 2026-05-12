import { describe, expect, it } from "vitest";
import { resolveIncidentPolicy } from "./cssd-incident-policy";

describe("cssd-incident-policy", () => {
  it("packaging_failure", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "CAP_PHAT",
      incidentTypeTen: "Loi dong goi/bao bi",
    });
    expect(p.targetStation).toBe("QC");
    expect(p.freezeSafetyLock).toBe(false);
    expect(p.clearSterilizationBatchLink).toBe(true);
  });

  it("biological_failure freezes", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "CAP_PHAT",
      incidentTypeTen: "KQ test sinh hoc khong dat",
    });
    expect(p.targetStation).toBe("DONG_GOI");
    expect(p.freezeSafetyLock).toBe(true);
  });

  it("equipment_block freezes at station", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "LAM_SACH",
      incidentTypeTen: "may rua loi khong hoat dong",
    });
    expect(p.kind).toBe("equipment_block");
    expect(p.freezeSafetyLock).toBe(true);
  });

  it("generic uses previous station", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "QC",
      incidentTypeTen: "Khác",
    });
    expect(p.targetStation).toBe("LAM_SACH");
  });
});
