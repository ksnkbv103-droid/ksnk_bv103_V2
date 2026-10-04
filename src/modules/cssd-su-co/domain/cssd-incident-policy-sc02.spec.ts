import { describe, expect, it } from "vitest";
import { resolveIncidentPolicy } from "./cssd-incident-policy";
import {
  canApproveCssdIncident,
  assertIncidentVoidReason,
} from "./cssd-incident-status";

describe("SC-02 policy", () => {
  it("một gói lỗi sau TK → TN, không thu hồi mẻ", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "CAP_PHAT",
      incidentTypeTen: "Một gói lỗi",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_SINGLE_PACK_FAIL",
      currentStation: "CAP_PHAT",
    });
    expect(p.targetStation).toBe("TIEP_NHAN");
    expect(p.recallEntireBatch).toBe(false);
    expect(p.holdMachineQc).toBe(false);
  });

  it("Bowie-Dick → giữ máy, không thu hồi", () => {
    const p = resolveIncidentPolicy({
      detectionStation: "TIET_KHUAN",
      incidentTypeTen: "BD",
      incidentGroup: "PROCESS",
      typeId: "PROCESS_BOWIE_DICK_FAIL",
    });
    expect(p.recallEntireBatch).toBe(false);
    expect(p.holdMachineQc).toBe(true);
  });
});

describe("SC-03 quyền tạm", () => {
  it("Trưởng CSSD / Admin được duyệt", () => {
    expect(canApproveCssdIncident(["TRUONG_CSSD"])).toBe(true);
    expect(canApproveCssdIncident(["ADMIN"])).toBe(true);
    expect(canApproveCssdIncident(["NV_KSNK"])).toBe(false);
  });

  it("vô hiệu bắt buộc lý do", () => {
    expect(assertIncidentVoidReason("", "").ok).toBe(false);
    expect(assertIncidentVoidReason("KHAC", "").ok).toBe(false);
    expect(assertIncidentVoidReason("NHAP_NHAM", "").ok).toBe(true);
  });
});
