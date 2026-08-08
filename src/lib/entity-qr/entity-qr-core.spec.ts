import { describe, expect, it } from "vitest";
import {
  buildEntityQrCode,
  buildLocationQrCode,
  classifyEntityQr,
} from "./entity-qr-core";

const UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("entity-qr-core", () => {
  it("builds prefixed codes uppercase", () => {
    expect(buildEntityQrCode("GSC_SESSION", UUID)).toBe(`GSC-${UUID}`.toUpperCase());
    expect(buildEntityQrCode("VST_SESSION", UUID)).toBe(`VST-${UUID}`.toUpperCase());
    expect(buildEntityQrCode("CSSD_INCIDENT", UUID)).toBe(`SC-${UUID}`.toUpperCase());
    expect(buildEntityQrCode("NKBV_CASE", UUID)).toBe(`NKBV-${UUID}`.toUpperCase());
    expect(buildEntityQrCode("QLCV_TASK", UUID)).toBe(`QLCV-${UUID}`.toUpperCase());
    expect(buildLocationQrCode("LOC_KHOA", "b01")).toBe("LOC-KHOA-B01");
  });

  it("classifies and returns reopen href", () => {
    const gsc = classifyEntityQr(`GSC-${UUID}`);
    expect(gsc.kind).toBe("GSC_SESSION");
    expect(gsc.href).toContain(`/giam-sat-chung?edit=`);
    expect(gsc.recordId).toBe(UUID);

    const vst = classifyEntityQr(`vst-${UUID}`);
    expect(vst.kind).toBe("VST_SESSION");
    expect(vst.href).toContain("/giam-sat-vst?edit=");

    const sc = classifyEntityQr(`SC-${UUID}`);
    expect(sc.kind).toBe("CSSD_INCIDENT");
    expect(sc.href).toContain("tab=incident");
    expect(sc.href).toContain("id=");

    const nkbv = classifyEntityQr(`NKBV-${UUID}`);
    expect(nkbv.kind).toBe("NKBV_CASE");
    expect(nkbv.href).toContain("/giam-sat-nkbv?case=");

    const lot = classifyEntityQr("LOT-ABC123");
    expect(lot.kind).toBe("CSSD");
    expect(lot.href).toBeTruthy();

    const locKhoa = classifyEntityQr("LOC-KHOA-B01");
    expect(locKhoa.kind).toBe("LOC_KHOA");
    expect(locKhoa.href).toBe("/giam-sat-chung?loc=khoa&ma=B01");

    const locKhu = classifyEntityQr("LOC-KHU-KHU01");
    expect(locKhu.kind).toBe("LOC_KHU");
    expect(locKhu.href).toBe("/giam-sat-chung?loc=khu&ma=KHU01");
  });

  it("rejects short GSC display refs without full uuid", () => {
    const bad = classifyEntityQr("GSC-20260728-A1B2C3D4");
    expect(bad.kind).toBe("UNKNOWN");
  });
});
