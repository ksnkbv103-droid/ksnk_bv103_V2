import { describe, expect, it } from "vitest";
import {
  buildCssdQuyTrinhQrOrFilter,
  classifyCssdCode,
  matchesDeviceCode,
  normalizeCssdCode,
} from "./cssd-qr-core";

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

  it("classifies LOT batch prefix", () => {
    expect(classifyCssdCode("LOT-123456")).toBe("STERILIZATION_BATCH");
  });

  it("matches device code case-insensitively and via alt QR", () => {
    expect(matchesDeviceCode("may-01", "MAY-01")).toBe(true);
    expect(matchesDeviceCode("MAY-01", "MAY-02")).toBe(false);
    expect(matchesDeviceCode("QR-MAY-01", "MAY-01", ["QR-MAY-01"])).toBe(true);
    expect(matchesDeviceCode("OTHER", "MAY-01", ["QR-MAY-01"])).toBe(false);
  });

  it("builds quy trình OR filter for hub resolve", () => {
    const f = buildCssdQuyTrinhQrOrFilter("b01.set.01");
    expect(f).toContain("ma_cycle_qr.eq.B01.SET.01");
    expect(f).toContain("ma_qr_bo_vinh_vien.eq.B01.SET.01");
    expect(f).toContain("ma_qr_quy_trinh.eq.B01.SET.01");
  });
});
