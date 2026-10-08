import { describe, expect, it } from "vitest";
import {
  INCIDENT_ALREADY_CONFIRMED,
  INCIDENT_STATUS_CLOSED,
  INCIDENT_STATUS_CONFIRMED,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_OPEN,
  assertIncidentPhieuCanCloseRelease,
  assertIncidentPhieuCanConfirm,
  buildIncidentCloseReleaseAttributePatch,
  buildIncidentConfirmAttributePatch,
  canCloseCssdIncidentRelease,
  canCloseSterilizationIncidentRelease,
  readIncidentPhieuStatus,
} from "./cssd-incident-status";
import { isBlockingSterilizationIncident } from "@/lib/domain/cssd-pack-issuance";

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

  it("refuses confirm after void", () => {
    expect(readIncidentPhieuStatus({ INCIDENT_STATUS: "VO_HIEU" })).toBe("VO_HIEU");
    expect(assertIncidentPhieuCanConfirm({ INCIDENT_STATUS: "VO_HIEU" }).ok).toBe(false);
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

  it("CSSD-02: đóng giải phóng cần xác nhận + 4 trường audit; role gate", () => {
    expect(assertIncidentPhieuCanCloseRelease({ INCIDENT_STATUS: "OPEN" }, { lyDo: "ok", soBienBan: "BB1" }).ok).toBe(
      false,
    );
    expect(
      assertIncidentPhieuCanCloseRelease(
        { INCIDENT_STATUS: "DA_XAC_NHAN" },
        { lyDo: "", soBienBan: "BB1" },
      ).ok,
    ).toBe(false);
    expect(
      assertIncidentPhieuCanCloseRelease(
        { INCIDENT_STATUS: "DA_XAC_NHAN" },
        { lyDo: "Đánh giá an toàn", soBienBan: "BB-24/01" },
      ),
    ).toEqual({ ok: true });

    const patch = buildIncidentCloseReleaseAttributePatch(
      { INCIDENT_STATUS: "DA_XAC_NHAN", INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL" },
      {
        closedAt: "2026-10-05T00:00:00.000Z",
        lyDo: "Đánh giá an toàn",
        soBienBan: "BB-24/01",
        closedByName: "Trưởng CSSD",
        closedById: "ns-1",
        closedByAuthUserId: "auth-1",
      },
    );
    expect(patch.INCIDENT_STATUS).toBe(INCIDENT_STATUS_CLOSED);
    expect(patch.INCIDENT_CLOSE_BIEN_BAN).toBe("BB-24/01");
    expect(patch.INCIDENT_CLOSE_REASON).toBe("Đánh giá an toàn");
    expect(patch.INCIDENT_CLOSED_BY_NAME).toBe("Trưởng CSSD");
    expect(INCIDENT_STATUS_LABEL.DA_DONG).toMatch(/Đã đóng/);

    expect(canCloseSterilizationIncidentRelease(["ADMIN"])).toBe(true);
    expect(canCloseSterilizationIncidentRelease(["HOI_DONG_KSNK"])).toBe(true);
    expect(canCloseSterilizationIncidentRelease(["NHAN_VIEN_KSNK"])).toBe(false);
    expect(canCloseCssdIncidentRelease({ roles: ["NHAN_VIEN_KSNK"], hasClosePermission: true })).toBe(true);
    expect(canCloseCssdIncidentRelease({ roles: ["NHAN_VIEN_KSNK"] })).toBe(false);
    expect(canCloseCssdIncidentRelease({ roles: ["TRUONG_CSSD"] })).toBe(true);

    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "c1",
          attributes: {
            INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
            INCIDENT_STATUS: "DA_DONG",
          },
        },
        { quyTrinhId: "c1" },
      ),
    ).toBe(false);
    expect(
      isBlockingSterilizationIncident(
        {
          quy_trinh_id: "c1",
          attributes: {
            INCIDENT_TYPE_CODE: "PROCESS_STERILIZATION_FAIL",
            INCIDENT_STATUS: "DA_XAC_NHAN",
          },
        },
        { quyTrinhId: "c1" },
      ),
    ).toBe(true);
  });
});
