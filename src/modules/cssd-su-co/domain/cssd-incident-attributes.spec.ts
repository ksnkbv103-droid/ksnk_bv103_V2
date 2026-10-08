import { describe, expect, it } from "vitest";
import {
  buildIncidentAttributes,
  countPriorSafetyIncidentsOnCycle,
  countsTowardCssdSafetyTally,
  collectReportRedQuyTrinhIds,
  quyTrinhIdsWithEffectiveRedAlert,
  readIncidentGroup,
  readIncidentTypeLabel,
  resolveProcessBatchLink,
} from "./cssd-incident-attributes";
import { readMigrationSql } from "@/lib/testing/migration-file";

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
    expect(attrs.INCIDENT_TYPE_CODE).toBeUndefined();
  });

  it("persists cause class and type code", () => {
    const attrs = buildIncidentAttributes({
      incidentGroup: "PROCESS",
      typeTen: "Chất lượng tiệt khuẩn / mẻ không đạt",
      typeId: "PROCESS_STERILIZATION_FAIL",
      causeClass: "SC_QUY_TRINH",
      incidentKind: "process_failure",
      rollbackTargetStation: "DONG_GOI",
    });
    expect(attrs.INCIDENT_TYPE_CODE).toBe("PROCESS_STERILIZATION_FAIL");
    expect(attrs.CAUSE_CLASS).toBe("SC_QUY_TRINH");
    expect(attrs.CAUSE_LABEL).toBe("Lỗi quy trình kỹ thuật");
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

  it("resolves batch link from quy trình when payload empty", () => {
    const linked = resolveProcessBatchLink({}, { lo_tiet_khuan_id: "44444444-4444-4444-4444-444444444444" });
    expect(linked.loTietKhuanId).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("keeps explicit payload batch id over quy trình", () => {
    const linked = resolveProcessBatchLink(
      { loTietKhuanId: "55555555-5555-5555-5555-555555555555", maLo: "LO-A" },
      { lo_tiet_khuan_id: "66666666-6666-6666-6666-666666666666" },
    );
    expect(linked.loTietKhuanId).toBe("55555555-5555-5555-5555-555555555555");
    expect(linked.maLo).toBe("LO-A");
  });

  it("không đếm luân chuyển vào sự cố; nháp chỉ tính khi đang ghi", () => {
    const move = { INCIDENT_TYPE_CODE: "INSTRUMENT_TRANSFER", SET_RECONCILE_STATUS: "NONE" };
    const draft = { INCIDENT_TYPE_CODE: "INSTRUMENT_SET_RECONCILE", SET_RECONCILE_STATUS: "DRAFT" };
    const hong = { INCIDENT_TYPE_CODE: "INSTRUMENT_SET_RECONCILE", SET_RECONCILE_STATUS: "NONE" };
    expect(countsTowardCssdSafetyTally(move)).toBe(false);
    expect(countsTowardCssdSafetyTally(move, { includeDraft: true })).toBe(false);
    expect(countsTowardCssdSafetyTally(draft)).toBe(false);
    expect(countsTowardCssdSafetyTally(draft, { includeDraft: true })).toBe(true);
    expect(countsTowardCssdSafetyTally(hong)).toBe(true);
  });

  it("cờ đỏ kho chỉ theo quy_trinh_id của phiếu PROCESS còn hiệu lực", () => {
    const ids = quyTrinhIdsWithEffectiveRedAlert([
      {
        quy_trinh_id: "qt-1",
        is_red_alert: true,
        is_active: true,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
      {
        quy_trinh_id: "qt-2",
        is_red_alert: true,
        is_active: false,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
      {
        quy_trinh_id: "qt-3",
        is_red_alert: true,
        is_active: true,
        attributes: {
          INCIDENT_GROUP: "PROCESS",
          INCIDENT_TYPE_CODE: "PROCESS_MISSTEP",
          SET_RECONCILE_STATUS: "DRAFT",
        },
      },
      {
        quy_trinh_id: "qt-4",
        is_red_alert: true,
        is_active: true,
        attributes: { INCIDENT_GROUP: "INSTRUMENT", INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
      },
      {
        quy_trinh_id: "",
        is_red_alert: true,
        is_active: true,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
    ]);
    expect([...ids]).toEqual(["qt-1"]);
  });

  it("nhật ký không tô đỏ chu kỳ khác chỉ vì cùng mã bộ", () => {
    const ids = collectReportRedQuyTrinhIds([
      { quy_trinh_id: "qt-1", is_red_alert: true, attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" } },
      { quy_trinh_id: null, is_red_alert: true, attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" } },
      {
        quy_trinh_id: "qt-2",
        is_red_alert: true,
        attributes: { INCIDENT_STATUS: "VO_HIEU", INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
      },
    ]);
    expect([...ids]).toEqual(["qt-1"]);
  });

  it("SC-04: cờ đỏ chỉ đếm PROCESS trên đúng chu kỳ", () => {
    const rows = [
      {
        quy_trinh_id: "qt-khac",
        is_active: true,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: false,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: true,
        attributes: { INCIDENT_GROUP: "INSTRUMENT", INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: true,
        attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_TRANSFER" },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: true,
        attributes: {
          INCIDENT_GROUP: "PROCESS",
          INCIDENT_TYPE_CODE: "PROCESS_MISSTEP",
          SET_RECONCILE_STATUS: "DRAFT",
        },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: true,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_MISSTEP" },
      },
      {
        quy_trinh_id: "qt-1",
        is_active: true,
        attributes: { INCIDENT_GROUP: "PROCESS", INCIDENT_TYPE_CODE: "PROCESS_QC_FAIL" },
      },
    ];
    // draft + 2 PROCESS hiệu lực = 3 prior
    expect(countPriorSafetyIncidentsOnCycle(rows, "qt-1")).toBe(3);
    expect(countPriorSafetyIncidentsOnCycle(rows, "")).toBe(0);
  });

  it("migration S-F2 khóa CTE đỏ theo quy_trinh và phiếu còn hiệu lực", () => {
    const sql = readMigrationSql("cssd_red_alert_by_quy_trinh");
    expect(sql).toContain("cssd_su_co_counts_for_red_alert");
    expect(sql).toContain("sc.quy_trinh_id");
    expect(sql).not.toMatch(/where\s+ma_qr_quy_trinh/i);
    for (const code of ["INSTRUMENT_MOVE", "INSTRUMENT_TRANSFER", "INSTRUMENT_REPLENISH", "INSTRUMENT_RETURN_KHO"]) {
      expect(sql).toContain(code);
    }
  });
});
