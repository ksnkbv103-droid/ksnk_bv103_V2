import { describe, expect, it } from "vitest";
import { assertSteamDailyBdForLoad, buildSteamDailyBdSpecsPatch } from "./cssd-steam-daily-bd";

describe("cssd-steam-daily-bd", () => {
  it("skips non-steam", () => {
    expect(assertSteamDailyBdForLoad({ isSteam: false }).ok).toBe(true);
  });

  it("blocks KHONG_DAT today", () => {
    const r = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-09-04",
      specs: { bd_dau_ngay_ymd: "2026-09-04", bd_dau_ngay_ket_qua: "KHONG_DAT" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/KHÔNG ĐẠT/i);
  });

  it("allows DAT today (hard-block contract pass)", () => {
    const r = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-09-04",
      specs: { bd_dau_ngay_ymd: "2026-09-04", bd_dau_ngay_ket_qua: "DAT" },
      requireRecorded: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warning).toBeUndefined();
  });

  it("QT.21 hard-block: missing BD → fail by default", () => {
    const hard = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-09-04",
      specs: {},
    });
    expect(hard.ok).toBe(false);
    if (!hard.ok) expect(hard.message).toMatch(/BD trước khi nạp|ĐẠT hôm nay/i);

    const stale = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-09-04",
      specs: { bd_dau_ngay_ymd: "2026-09-03", bd_dau_ngay_ket_qua: "DAT" },
      requireRecorded: true,
    });
    expect(stale.ok).toBe(false);
  });

  it("soft-warning only when requireRecorded=false", () => {
    const soft = assertSteamDailyBdForLoad({
      isSteam: true,
      todayYmd: "2026-09-04",
      specs: {},
      requireRecorded: false,
    });
    expect(soft.ok).toBe(true);
    if (soft.ok) expect(soft.warning).toMatch(/BD đầu ngày/);
  });

  it("patches specs", () => {
    const p = buildSteamDailyBdSpecsPatch({
      ymd: "2026-09-04",
      ketQua: "DAT",
      existing: { model: "X" },
    });
    expect(p.bd_dau_ngay_ket_qua).toBe("DAT");
    expect(p.model).toBe("X");
  });
});
