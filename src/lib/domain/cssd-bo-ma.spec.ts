import { describe, expect, it } from "vitest";
import {
  buildCssdBoMa,
  buildCssdSubBoMa,
  isCssdUnifiedBoMa,
  isRejectedLegacyHexBoQr,
  maxBoMaSequence,
} from "./cssd-bo-ma";

describe("cssd-bo-ma", () => {
  it("builds khoa.SET.nn format", () => {
    expect(buildCssdBoMa("B01", 1)).toBe("B01.SET.01");
    expect(buildCssdBoMa("b01", 12)).toBe("B01.SET.12");
  });

  it("validates unified ma_bo", () => {
    expect(isCssdUnifiedBoMa("B01.SET.01")).toBe(true);
    expect(isCssdUnifiedBoMa("BV103-DC-ABC")).toBe(false);
  });

  it("rejects legacy hex QR", () => {
    expect(isRejectedLegacyHexBoQr("BV103-DC-3E118D5052")).toBe(true);
    expect(isRejectedLegacyHexBoQr("B01.SET.01")).toBe(false);
  });

  it("builds SUB suffix", () => {
    expect(buildCssdSubBoMa("B01.SET.01")).toBe("B01.SET.01-SUB");
  });

  it("max sequence from list", () => {
    expect(maxBoMaSequence(["B01.SET.01", "B01.SET.07", "PMO.SET.01"], "B01")).toBe(7);
  });
});
