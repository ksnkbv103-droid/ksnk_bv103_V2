import { describe, expect, it } from "vitest";
import {
  mapInstrumentPresetToLedgerType,
  shouldDetachChiTietFromSet,
  validateIssueQuantityAgainstThucTe,
} from "./cssd-instrument-incident";

describe("cssd-instrument-incident", () => {
  it("maps preset codes to ledger types", () => {
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_BROKEN")).toBe("BAO_HONG");
    expect(mapInstrumentPresetToLedgerType("INSTRUMENT_TRANSFER")).toBe("DIEU_CHUYEN");
    expect(mapInstrumentPresetToLedgerType("PROCESS_QC_FAIL")).toBeNull();
  });

  it("detaches only when quantity covers entire chi tiết row", () => {
    expect(shouldDetachChiTietFromSet(1, 3)).toBe(false);
    expect(shouldDetachChiTietFromSet(3, 3)).toBe(true);
  });

  it("rejects quantity above thực tế", () => {
    expect(validateIssueQuantityAgainstThucTe(2, 1)).toMatch(/không được vượt/);
    expect(validateIssueQuantityAgainstThucTe(1, 2)).toBeNull();
  });
});
