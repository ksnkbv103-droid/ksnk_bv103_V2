import { describe, expect, it } from "vitest";
import { classifyCssdCode, matchesDeviceCode, normalizeCssdCode } from "./cssd-qr-core";

describe("cssd-qr-core", () => {
  it("normalizes scan input to uppercase trimmed string", () => {
    expect(normalizeCssdCode("  b01.set.01  ")).toBe("B01.SET.01");
  });

  it("classifies unified ma_bo as instrument set", () => {
    expect(classifyCssdCode("B01.SET.01")).toBe("INSTRUMENT_SET");
    expect(classifyCssdCode("B01.SET.01-SUB")).toBe("INSTRUMENT_SET");
  });

  it("rejects legacy hex codes", () => {
    expect(classifyCssdCode("BV103-DC-3E118D5052")).toBe("UNKNOWN");
    expect(classifyCssdCode("BV103-SUB-1234ABCD")).toBe("UNKNOWN");
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
