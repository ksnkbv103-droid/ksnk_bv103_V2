import { describe, expect, it } from "vitest";
import {
  INSTRUMENT_CHANGE_REQUIRES_INCIDENT,
  instrumentChangeRequiresIncidentResult,
  mapInstrumentPresetToLedgerType,
  shouldDetachChiTietFromSet,
  validateIssueQuantityAgainstThucTe,
  computeSoLuongThucTeQldcpt,
} from "./cssd-instrument-incident";

describe("cssd-instrument-incident", () => {
  it("maps preset codes to ledger types", () => {
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_BROKEN")).toBe("BAO_HONG");
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_TRANSFER")).toBe("DIEU_CHUYEN");
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_RETURN_KHO")).toBe("NHAP_KHO");
    expect(mapInstrumentPresetToLedgerType("PROCESS_QC_FAIL")).toBeNull();
  });

  it("never detaches BOM on Hỏng/Mất (catalog change slip only)", () => {
    expect(shouldDetachChiTietFromSet(1, 3)).toBe(false);
    expect(shouldDetachChiTietFromSet(3, 3)).toBe(false);
  });

  it("rejects quantity above thực tế", () => {
    expect(validateIssueQuantityAgainstThucTe(2, 1)).toMatch(/không được vượt/);
    expect(validateIssueQuantityAgainstThucTe(1, 2)).toBeNull();
  });

  it("requires 3-door variance slip for operational instrument changes (D1)", () => {
    const res = instrumentChangeRequiresIncidentResult();
    expect(res.success).toBe(false);
    expect(res.error).toBe(INSTRUMENT_CHANGE_REQUIRES_INCIDENT);
    expect(res.error).toMatch(/3 cửa/);
  });

  it("QLDCPT thucTe = chuan - hong - mat + boSung ± DC (D1/D6 SSOT)", () => {
    expect(
      computeSoLuongThucTeQldcpt({
        soLuongChuan: 12,
        soLuongHong: 1,
        soLuongMat: 2,
        soLuongBoSung: 3,
        soLuongDieuChuyenNet: -1,
      }),
    ).toBe(11);
    expect(computeSoLuongThucTeQldcpt({ soLuongChuan: 5, soLuongHong: 9 })).toBe(0);
    expect(computeSoLuongThucTeQldcpt({ soLuongChuan: 4, soLuongDieuChuyenNet: 2 })).toBe(6);
  });
});
