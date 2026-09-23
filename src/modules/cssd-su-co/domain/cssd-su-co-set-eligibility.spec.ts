import { describe, expect, it } from "vitest";
import {
  explainSuCoSetOut,
  isOpenCycleEligibleForSuCo,
  isSuCoOpenCycleStation,
  SU_CO_OPEN_CYCLE_STATIONS,
} from "./cssd-su-co-set-eligibility";

describe("cssd-su-co-set-eligibility", () => {
  it("keeps every processing station including CAP_PHAT before clinical use", () => {
    for (const station of SU_CO_OPEN_CYCLE_STATIONS) {
      expect(
        isOpenCycleEligibleForSuCo({ isActive: true, stationCode: station, maCaMoId: null }),
      ).toBe(true);
    }
  });

  it("drops CAP_PHAT once a surgical case is linked", () => {
    expect(
      isOpenCycleEligibleForSuCo({
        isActive: true,
        stationCode: "CAP_PHAT",
        maCaMoId: "MO-2026-014",
      }),
    ).toBe(false);
    expect(
      explainSuCoSetOut({ isActive: true, stationCode: "CAP_PHAT", maCaMoId: "MO-2026-014" }),
    ).toMatch(/đã sử dụng tại khoa/);
  });

  it("drops a cycle closed by a new reception", () => {
    expect(
      isOpenCycleEligibleForSuCo({ isActive: false, stationCode: "CAP_PHAT", maCaMoId: null }),
    ).toBe(false);
    expect(
      explainSuCoSetOut({ isActive: false, stationCode: "CAP_PHAT", maCaMoId: null }),
    ).toMatch(/đóng chu trình/);
  });

  it("drops a catalog shell with no station", () => {
    expect(
      isOpenCycleEligibleForSuCo({ isActive: true, stationCode: null, maCaMoId: null }),
    ).toBe(false);
    expect(explainSuCoSetOut({ isActive: true, stationCode: "", maCaMoId: null })).toMatch(/danh mục/);
  });

  it("follows the real station for quarantine — CHO_BI is not a station", () => {
    expect(isSuCoOpenCycleStation("CHO_BI")).toBe(false);
    expect(
      isOpenCycleEligibleForSuCo({ isActive: true, stationCode: "TIET_KHUAN", maCaMoId: "  " }),
    ).toBe(true);
    expect(
      isOpenCycleEligibleForSuCo({ isActive: true, stationCode: "CHO_BI", maCaMoId: null }),
    ).toBe(false);
  });
});
