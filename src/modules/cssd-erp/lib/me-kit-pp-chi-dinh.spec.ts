import { describe, expect, it } from "vitest";
import {
  evaluatePpChiDinhGate,
  inferSteamCycleFromChuongTrinh,
  MSG_PP_MISSING_WARN,
  MSG_PP_PLASMA_EO_CROSS,
  MSG_PP_STEAM_CYCLE,
} from "./me-kit-pp-chi-dinh";

describe("inferSteamCycleFromChuongTrinh", () => {
  it("nhận mã HN_134 / HN_121", () => {
    expect(inferSteamCycleFromChuongTrinh({ chuongTrinhMa: "HN_134" })).toBe("STEAM_134");
    expect(inferSteamCycleFromChuongTrinh({ chuongTrinhTen: "Hơi nước 121 °C" })).toBe("STEAM_121");
  });
});

describe("evaluatePpChiDinhGate (CSSD-10)", () => {
  it("chặn Plasma chỉ định trên máy EO và ngược lại", () => {
    expect(
      evaluatePpChiDinhGate({
        method: "EO",
        lines: [{ phuong_phap_tiet_khuan_chi_dinh: "PLASMA" }],
      }).ok,
    ).toBe(false);
    expect(
      evaluatePpChiDinhGate({
        method: "PLASMA_H2O2",
        lines: [{ phuong_phap_tiet_khuan_chi_dinh: "EO" }],
      }).ok,
    ).toBe(false);
    const cross = evaluatePpChiDinhGate({
      method: "PLASMA_H2O2",
      lines: [{ phuong_phap_tiet_khuan_chi_dinh: "EO" }],
    });
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.message).toBe(MSG_PP_PLASMA_EO_CROSS);
  });

  it("chặn STEAM_121 vs chu trình 134 khi đã biết chương trình", () => {
    const r = evaluatePpChiDinhGate({
      method: "HOI_NUOC",
      steamCycle: "STEAM_134",
      lines: [{ phuong_phap_tiet_khuan_chi_dinh: "STEAM_121" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(MSG_PP_STEAM_CYCLE);
  });

  it("thiếu PP chỉ cảnh báo, không chặn", () => {
    const r = evaluatePpChiDinhGate({
      method: "HOI_NUOC",
      steamCycle: "STEAM_134",
      lines: [{ phuong_phap_tiet_khuan_chi_dinh: null }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toContain(MSG_PP_MISSING_WARN);
  });
});
