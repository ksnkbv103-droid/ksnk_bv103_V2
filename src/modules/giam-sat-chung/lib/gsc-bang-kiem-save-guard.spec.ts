import { describe, expect, it } from "vitest";
import {
  GSC_BK_INACTIVE_NEW_SESSION,
  GSC_BK_NOT_AP_DUNG_KHOA,
  assertGscBangKiemForNewOrSwitch,
  gscIsBangKiemSwitch,
} from "./gsc-bang-kiem-save-guard";

describe("gscIsBangKiemSwitch", () => {
  it("is false when previous id is missing (phiếu cũ / tạo mới do caller tách)", () => {
    expect(gscIsBangKiemSwitch(null, "bk-2")).toBe(false);
    expect(gscIsBangKiemSwitch("", "bk-2")).toBe(false);
  });

  it("is true only when both ids exist and differ", () => {
    expect(gscIsBangKiemSwitch("bk-1", "bk-2")).toBe(true);
    expect(gscIsBangKiemSwitch("bk-1", "bk-1")).toBe(false);
  });
});

describe("assertGscBangKiemForNewOrSwitch", () => {
  it("rejects inactive template for new or switched session", () => {
    expect(
      assertGscBangKiemForNewOrSwitch({
        isActive: false,
        mangLuoiRestricted: false,
        apDungChoKhoa: true,
      }),
    ).toEqual({ ok: false, error: GSC_BK_INACTIVE_NEW_SESSION });
  });

  it("rejects mạng lưới when template no longer applies to khoa", () => {
    expect(
      assertGscBangKiemForNewOrSwitch({
        isActive: true,
        mangLuoiRestricted: true,
        apDungChoKhoa: false,
      }),
    ).toEqual({ ok: false, error: GSC_BK_NOT_AP_DUNG_KHOA });
  });

  it("allows active template for KSNK/admin even if not ap_dung khoa", () => {
    expect(
      assertGscBangKiemForNewOrSwitch({
        isActive: true,
        mangLuoiRestricted: false,
        apDungChoKhoa: false,
      }),
    ).toEqual({ ok: true });
  });
});
