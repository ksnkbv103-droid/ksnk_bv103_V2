import { describe, expect, it } from "vitest";
import { classifyCssdCode, matchesDeviceCode, normalizeCssdCode } from "./cssd-qr-core";

describe("cssd-qr-core", () => {
  it("normalizes scan input to uppercase trimmed string", () => {
    expect(normalizeCssdCode("  bv103-dc-ab12  ")).toBe("BV103-DC-AB12");
  });

  it("classifies known instrument prefixes", () => {
    expect(classifyCssdCode("BV103-DC-AAAA")).toBe("INSTRUMENT_SET");
    expect(classifyCssdCode("bv103-sub-1234")).toBe("INSTRUMENT_SET");
  });

  it("classifies cycle QR prefix as instrument set", () => {
    expect(classifyCssdCode("BV103-CYC-250610-AB12CD34")).toBe("INSTRUMENT_SET");
  });

  it("classifies machine-like codes by conventional prefix", () => {
    expect(classifyCssdCode("MAY-01")).toBe("MACHINE");
    expect(classifyCssdCode("tb-ht-02")).toBe("MACHINE");
  });

  it("matches device code case-insensitively", () => {
    expect(matchesDeviceCode("may-01", "MAY-01")).toBe(true);
    expect(matchesDeviceCode("MAY-01", "MAY-02")).toBe(false);
  });
});
