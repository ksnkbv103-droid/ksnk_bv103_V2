import { describe, expect, it } from "vitest";
import { resolveIncidentPolicy } from "./cssd-incident-policy";

describe("cssd-incident-policy", () => {
  it("process_failure rollbacks at fault station", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "CAP_PHAT",
      incidentTypeTen: "Sai thao tác đóng gói",
      incidentGroup: "PROCESS",
      faultStation: "DONG_GOI",
    });
    expect(p.targetStation).toBe("DONG_GOI");
    expect(p.faultStation).toBe("DONG_GOI");
    expect(p.freezeSafetyLock).toBe(false);
    expect(p.clearSterilizationBatchLink).toBe(false);
  });

  it("chemical_issue freezes", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "TIET_KHUAN",
      incidentTypeTen: "Nồng độ hóa chất không đạt",
      incidentGroup: "CHEMICAL",
    });
    expect(p.targetStation).toBe("TIET_KHUAN");
    expect(p.freezeSafetyLock).toBe(true);
  });

  it("equipment_block freezes at station", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "LAM_SACH",
      incidentTypeTen: "may rua loi khong hoat dong",
      incidentGroup: "EQUIPMENT",
    });
    expect(p.kind).toBe("equipment_block");
    expect(p.freezeSafetyLock).toBe(true);
  });

  it("PROCESS misstep uses detection station when no fault", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "QC",
      incidentTypeTen: "Khác",
      incidentGroup: "PROCESS",
    });
    expect(p.targetStation).toBe("QC");
  });

  it("OTHER without fault rolls back to previous workflow step", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "QC",
      incidentTypeTen: "Khác — mô tả",
      incidentGroup: "OTHER",
    });
    expect(p.targetStation).toBe("LAM_SACH");
    expect(p.faultStation).toBe("QC");
    expect(p.kind).toBe("generic");
  });

  it("OTHER respects explicit fault station", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "CAP_PHAT",
      incidentTypeTen: "Khác",
      incidentGroup: "OTHER",
      faultStation: "DONG_GOI",
    });
    expect(p.targetStation).toBe("DONG_GOI");
    expect(p.faultStation).toBe("DONG_GOI");
  });
});
