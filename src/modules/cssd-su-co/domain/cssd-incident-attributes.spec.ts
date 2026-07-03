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
