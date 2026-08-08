import { describe, expect, it } from "vitest";
import {
  buildIncidentAttributes,
  readIncidentGroup,
  readIncidentTypeLabel,
} from "./cssd-incident-attributes";

describe("cssd-incident-attributes", () => {
  it("builds SSOT keys for insert", () => {
    const attrs = buildIncidentAttributes({
      incidentGroup: "CHEMICAL",
      typeTen: "Nồng độ không đạt",
      incidentKind: "CHEMICAL_ISSUE",
      rollbackTargetStation: "TIET_KHUAN",
      machineId: "hc-uuid",
      errorQR: "LOT-001",
    });
    expect(attrs.INCIDENT_GROUP).toBe("CHEMICAL");
    expect(attrs.INCIDENT_TYPE_LABEL).toBe("Nồng độ không đạt");
    expect(attrs.MACHINE_ID).toBe("hc-uuid");
    expect(attrs.ERROR_QR).toBe("LOT-001");
  });

  it("embeds process batch ids for PROCESS incidents", () => {
    const attrs = buildIncidentAttributes({
      incidentGroup: "PROCESS",
      typeTen: "Chất lượng tiệt khuẩn / mẻ không đạt",
      incidentKind: "PROCESS_STERILIZATION_FAIL",
      rollbackTargetStation: "DONG_GOI",
      loTietKhuanId: "11111111-1111-1111-1111-111111111111",
      maLo: "LO-2026-01",
    });
    expect(attrs.LO_TIET_KHUAN_ID).toBe("11111111-1111-1111-1111-111111111111");
    expect(attrs.MA_LO).toBe("LO-2026-01");
  });

  it("persists fault operator id and detector id", () => {
    const attrs = buildIncidentAttributes({
      incidentGroup: "PROCESS",
      typeTen: "Sai thao tác",
      incidentKind: "process_failure",
      rollbackTargetStation: "DONG_GOI",
      faultOperator: "Nguyễn A",
      faultOperatorId: "22222222-2222-2222-2222-222222222222",
      nguoiPhatHien: "Trần B",
      nguoiPhatHienId: "33333333-3333-3333-3333-333333333333",
    });
    expect(attrs.FAULT_OPERATOR).toBe("Nguyễn A");
    expect(attrs.FAULT_OPERATOR_ID).toBe("22222222-2222-2222-2222-222222222222");
    expect(attrs.NGUOI_PHAT_HIEN_ID).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("reads type label with legacy lowercase fallback", () => {
    expect(readIncidentTypeLabel({ incident_type_label: "Máy hỏng" })).toBe("Máy hỏng");
    expect(readIncidentTypeLabel({ INCIDENT_TYPE_LABEL: "QC fail" })).toBe("QC fail");
    expect(readIncidentTypeLabel({})).toBeNull();
  });

  it("reads group with legacy lowercase fallback", () => {
    expect(readIncidentGroup({ INCIDENT_GROUP: "EQUIPMENT" })).toBe("EQUIPMENT");
    expect(readIncidentGroup({ incident_group: "PROCESS" })).toBe("PROCESS");
  });
});
