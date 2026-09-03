import { describe, expect, it } from "vitest";
import {
  INCIDENT_ALREADY_CONFIRMED,
  INCIDENT_STATUS_CONFIRMED,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_OPEN,
  assertIncidentPhieuCanConfirm,
  buildIncidentConfirmAttributePatch,
  readIncidentPhieuStatus,
} from "./cssd-incident-status";

describe("cssd-incident-status", () => {
  it("treats missing status as open (phiếu cũ)", () => {
    expect(readIncidentPhieuStatus({})).toBe(INCIDENT_STATUS_OPEN);
    expect(readIncidentPhieuStatus(null)).toBe(INCIDENT_STATUS_OPEN);
    expect(INCIDENT_STATUS_LABEL.OPEN).toBe("Chưa xác nhận");
  });

  it("reads confirmed from attributes", () => {
    expect(readIncidentPhieuStatus({ INCIDENT_STATUS: "DA_XAC_NHAN" })).toBe(INCIDENT_STATUS_CONFIRMED);
    expect(assertIncidentPhieuCanConfirm({ INCIDENT_STATUS: "DA_XAC_NHAN" })).toEqual({
      ok: false,
      error: INCIDENT_ALREADY_CONFIRMED,
    });
  });

  it("allows confirm when open and stamps confirm fields", () => {
    expect(assertIncidentPhieuCanConfirm({})).toEqual({ ok: true });
    const patch = buildIncidentConfirmAttributePatch(
      { INCIDENT_GROUP: "PROCESS" },
      {
        confirmedAt: "2026-08-26T00:00:00.000Z",
        confirmedById: "ns-1",
        confirmedByName: "Nguyễn A",
        confirmedByAuthUserId: "auth-1",
      },
    );
    expect(patch.INCIDENT_STATUS).toBe(INCIDENT_STATUS_CONFIRMED);
    expect(patch.INCIDENT_GROUP).toBe("PROCESS");
    expect(patch.INCIDENT_CONFIRMED_BY_NAME).toBe("Nguyễn A");
  });
});
