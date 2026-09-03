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

  it("INSTRUMENT group does not freeze workflow", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "DONG_GOI",
      incidentTypeTen: "Dụng cụ hỏng",
      incidentGroup: "INSTRUMENT",
    });
    expect(p.freezeSafetyLock).toBe(false);
    expect(p.clearSterilizationBatchLink).toBe(false);
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

  it("PROCESS sterilization fail rolls back to DONG_GOI and freezes", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "TIET_KHUAN",
      incidentTypeTen: "Chất lượng tiệt khuẩn / mẻ không đạt",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_STERILIZATION_FAIL",
    });
    expect(p.targetStation).toBe("DONG_GOI");
    expect(p.freezeSafetyLock).toBe(true);
    expect(p.clearSterilizationBatchLink).toBe(true);
    expect(p.recallEntireBatch).toBe(true);
    expect(p.holdMachineQc).toBe(true);
  });

  it("PROCESS BI+ uses same batch rollback as mẻ không đạt", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "TIET_KHUAN",
      incidentTypeTen: "Chỉ thị sinh học (BI) dương tính",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_BI_POSITIVE",
    });
    expect(p.targetStation).toBe("DONG_GOI");
    expect(p.freezeSafetyLock).toBe(true);
    expect(p.clearSterilizationBatchLink).toBe(true);
    expect(p.recallEntireBatch).toBe(true);
    expect(p.holdMachineQc).toBe(true);
  });

  it("PROCESS BI+ on issued set returns to Tiếp nhận without freeze", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "TIET_KHUAN",
      currentStation: "CAP_PHAT",
      incidentTypeTen: "Chỉ thị sinh học (BI) dương tính",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_BI_POSITIVE",
    });
    expect(p.targetStation).toBe("TIEP_NHAN");
    expect(p.freezeSafetyLock).toBe(false);
    expect(p.recallEntireBatch).toBe(true);
  });

  it("PROCESS station QC fail does not use batch rollback", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "QC",
      incidentTypeTen: "Không đạt kiểm tra chất lượng tại khâu",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_QC_FAIL",
    });
    expect(p.targetStation).toBe("QC");
    expect(p.freezeSafetyLock).toBe(false);
    expect(p.recallEntireBatch).toBe(false);
    expect(p.holdMachineQc).toBe(false);
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
