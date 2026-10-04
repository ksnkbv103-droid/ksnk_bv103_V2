import { describe, expect, it } from "vitest";
import {
  assertSteamDailyBdForLoad,
  buildSteamDailyBdSpecsPatch,
  readSteamDailyBdFromSpecs,
  shouldHoldMachineAfterBdFail,
  steamBdClientYmdAllowed,
} from "./cssd-steam-daily-bd";

describe("cssd-steam-daily-bd ME-02", () => {
  it("blocks KHONG_DAT today and missing DAT", () => {
    expect(
      assertSteamDailyBdForLoad({
        isSteam: true,
        todayYmd: "2026-10-05",
        specs: { bd_dau_ngay_ymd: "2026-10-05", bd_dau_ngay_ket_qua: "KHONG_DAT" },
      }).ok,
    ).toBe(false);
    expect(
      assertSteamDailyBdForLoad({
        isSteam: true,
        todayYmd: "2026-10-05",
        specs: { bd_dau_ngay_ymd: "2026-10-04", bd_dau_ngay_ket_qua: "DAT" },
      }).ok,
    ).toBe(false);
  });

  it("blocks DAT recorded before bảo trì hoàn thành (M-11)", () => {
    const r = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-10-05",
      specs: {
        bd_dau_ngay_ymd: "2026-10-05",
        bd_dau_ngay_ket_qua: "DAT",
        bd_dau_ngay_at: "2026-10-05T08:00:00.000Z",
      },
      baoTriCompletedAt: "2026-10-05T09:00:00.000Z",
      machineHeldForBd: true,
    });
    expect(r.ok).toBe(false);
    expect(String((r as { message?: string }).message || "")).toMatch(/bảo trì/i);
  });

  it("allows DAT after bảo trì hoàn thành", () => {
    const r = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-10-05",
      specs: {
        bd_dau_ngay_ymd: "2026-10-05",
        bd_dau_ngay_ket_qua: "DAT",
        bd_dau_ngay_at: "2026-10-05T10:00:00.000Z",
      },
      baoTriCompletedAt: "2026-10-05T09:00:00.000Z",
      machineHeldForBd: true,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects client ymd khác ngày server", () => {
    expect(steamBdClientYmdAllowed("2026-10-04", "2026-10-05")).toBe(false);
    expect(steamBdClientYmdAllowed("2026-10-05", "2026-10-05")).toBe(true);
    expect(steamBdClientYmdAllowed(undefined, "2026-10-05")).toBe(true);
  });

  it("HOLD after BD fail; merge specs keeps catalog keys", () => {
    expect(shouldHoldMachineAfterBdFail("KHONG_DAT")).toBe(true);
    expect(shouldHoldMachineAfterBdFail("DAT")).toBe(false);
    const patch = buildSteamDailyBdSpecsPatch({
      ymd: "2026-10-05",
      ketQua: "DAT",
      existing: { chuong_trinh_catalog: [{ ma: "A" }], hang_san_xuat: "X" },
    });
    expect(patch.chuong_trinh_catalog).toEqual([{ ma: "A" }]);
    expect(readSteamDailyBdFromSpecs(patch).ketQua).toBe("DAT");
  });
});
