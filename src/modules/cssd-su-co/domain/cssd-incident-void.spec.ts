import { describe, expect, it } from "vitest";
import { countsTowardCssdSafetyTally } from "./cssd-incident-attributes";
import { planCssdIncidentVoid, summarizeVoidLedger } from "./cssd-incident-void";

const processAttrs = {
  INCIDENT_GROUP: "PROCESS",
  INCIDENT_TYPE_CODE: "PROCESS_PACK_WET",
  INCIDENT_TYPE_LABEL: "Gói ướt",
  ROLLBACK_TARGET_STATION: "DONG_GOI",
  INCIDENT_STATUS: "OPEN",
};

describe("planCssdIncidentVoid", () => {
  it("từ chối thu hồi cả mẻ, nháp, duyệt BOM, điều chuyển", () => {
    const base = {
      peers: [],
      ledger: [],
      rollbackEvents: [],
      currentLoId: null,
      voidedAt: "2026-10-01T00:00:00.000Z",
    };
    expect(
      planCssdIncidentVoid({
        ...base,
        ticket: {
          id: "1",
          isActive: true,
          attributes: { ...processAttrs, BATCH_RECALL: "1" },
          moTa: "mẻ",
          detectionStation: "CAP_PHAT",
          quyTrinhId: "qt-1",
        },
      }).ok,
    ).toBe(false);
    expect(
      planCssdIncidentVoid({
        ...base,
        ticket: {
          id: "1",
          isActive: true,
          attributes: { SET_RECONCILE_STATUS: "DRAFT" },
          moTa: "",
          detectionStation: "QC",
          quyTrinhId: null,
        },
      }).ok,
    ).toBe(false);
    expect(
      planCssdIncidentVoid({
        ...base,
        ticket: {
          id: "1",
          isActive: true,
          attributes: { SET_RECONCILE_STATUS: "BOM_APPROVED" },
          moTa: "",
          detectionStation: "QC",
          quyTrinhId: null,
        },
      }).ok,
    ).toBe(false);
    const transfer = summarizeVoidLedger([
      { id: "g1", loaiGiaoDich: "DIEU_CHUYEN", soLuongThayDoi: -1, loaiDungCuId: "L", isActive: true },
    ]);
    expect(transfer.ok).toBe(false);
  });

  it("trả trạm và stamp khi phiếu này là lần đẩy lui cuối, tắt cờ đỏ", () => {
    const plan = planCssdIncidentVoid({
      ticket: {
        id: "sc-1",
        isActive: true,
        attributes: processAttrs,
        moTa: "ướt",
        detectionStation: "TIET_KHUAN",
        quyTrinhId: "qt-1",
      },
      peers: [
        {
          quy_trinh_id: "qt-1",
          is_active: true,
          is_red_alert: false,
          attributes: { INCIDENT_TYPE_CODE: "INSTRUMENT_BROKEN" },
        },
      ],
      ledger: [],
      rollbackEvents: [
        {
          su_kien: "SU_CO_DOMINO_ROLLBACK",
          tu_tram: "TIET_KHUAN",
          den_tram: "DONG_GOI",
          chi_tiet: {
            su_co_id: "sc-1",
            mo_ta: "ướt",
            before: { thoi_gian_tiet_khuan: "2026-09-01T01:00:00.000Z", nguoi_tiet_khuan_id: "ns-9" },
          },
        },
      ],
      currentLoId: null,
      voidedAt: "2026-10-01T00:00:00.000Z",
      actorName: "Lan",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.already) return;
    expect(plan.cycle?.restoreStation).toBe("TIET_KHUAN");
    expect(plan.cycle?.stamps.thoi_gian_tiet_khuan).toBe("2026-09-01T01:00:00.000Z");
    expect(plan.cycle?.isRedAlert).toBe(false);
    expect(plan.attributes.INCIDENT_STATUS).toBe("VO_HIEU");
    expect(plan.attributes.INCIDENT_VOIDED_BY_NAME).toBe("Lan");
    expect(countsTowardCssdSafetyTally(plan.attributes)).toBe(false);
  });

  it("phiếu sau giữ trạm; Hỏng trả tồn và cộng lại kho bổ sung", () => {
    const plan = planCssdIncidentVoid({
      ticket: {
        id: "sc-old",
        isActive: true,
        attributes: {
          INCIDENT_GROUP: "INSTRUMENT",
          INCIDENT_TYPE_CODE: "INSTRUMENT_SET_RECONCILE",
          SET_RECONCILE_STATUS: "NONE",
          ROLLBACK_TARGET_STATION: "NONE",
        },
        moTa: "hỏng kẹp",
        detectionStation: "QC",
        quyTrinhId: "qt-1",
      },
      peers: [
        {
          quy_trinh_id: "qt-1",
          is_active: true,
          is_red_alert: true,
          ma_tram_phat_hien: "QC",
          attributes: { INCIDENT_GROUP: "CHEMICAL", INCIDENT_TYPE_LABEL: "Hóa chất", ROLLBACK_TARGET_STATION: "QC" },
        },
      ],
      ledger: [
        { id: "h1", loaiGiaoDich: "BAO_HONG", soLuongThayDoi: -2, loaiDungCuId: "L1", isActive: true },
        { id: "b1", loaiGiaoDich: "BO_SUNG", soLuongThayDoi: 1, loaiDungCuId: "L1", isActive: true },
        { id: "off", loaiGiaoDich: "BAO_MAT", soLuongThayDoi: -1, loaiDungCuId: "L2", isActive: false },
      ],
      rollbackEvents: [
        {
          su_kien: "SU_CO_DOMINO_ROLLBACK",
          tu_tram: "CAP_PHAT",
          den_tram: "TIET_KHUAN",
          chi_tiet: { su_co_id: "sc-later", before: { thoi_gian_cap_phat: "x" } },
        },
      ],
      currentLoId: "lo-1",
      voidedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.already) return;
    expect(plan.cycle?.restoreStation).toBeNull();
    expect(plan.cycle?.isRedAlert).toBe(true);
    expect(plan.deactivateLedgerIds).toEqual(["h1", "b1"]);
    expect(plan.khoDelta).toEqual([{ loaiDungCuId: "L1", delta: 1 }]);
  });

  it("hóa chất khóa an toàn: hết phiếu khóa thì mở khóa", () => {
    const plan = planCssdIncidentVoid({
      ticket: {
        id: "sc-c",
        isActive: true,
        attributes: {
          INCIDENT_GROUP: "CHEMICAL",
          INCIDENT_TYPE_LABEL: "Nồng độ",
          ROLLBACK_TARGET_STATION: "TIET_KHUAN",
          LO_TIET_KHUAN_ID: "lo-9",
        },
        moTa: "nồng độ",
        detectionStation: "TIET_KHUAN",
        quyTrinhId: "qt-1",
      },
      peers: [],
      ledger: [],
      rollbackEvents: [
        {
          su_kien: "SU_CO_DOMINO_ROLLBACK",
          tu_tram: "TIET_KHUAN",
          den_tram: "TIET_KHUAN",
          chi_tiet: { mo_ta: "nồng độ", before: {} },
        },
      ],
      currentLoId: null,
      voidedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.already) return;
    expect(plan.cycle?.isDongBang).toBe(false);
    expect(plan.cycle?.restoreLoId).toBe("lo-9");
    expect(plan.cycle?.restoreStation).toBe("TIET_KHUAN");
  });

  it("phiếu đã tắt thì bỏ qua", () => {
    const plan = planCssdIncidentVoid({
      ticket: {
        id: "1",
        isActive: false,
        attributes: processAttrs,
        moTa: "",
        detectionStation: "QC",
        quyTrinhId: "qt-1",
      },
      peers: [],
      ledger: [],
      rollbackEvents: [],
      currentLoId: null,
      voidedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(plan).toEqual({ ok: true, already: true });
  });
});
