import { describe, expect, it } from "vitest";
import { isCssdCycleUsedClinically } from "@/modules/cssd-erp/shared/domain/cssd-cycle-clinical-use";
import {
  explainSuCoSetOut,
  isOpenCycleEligibleForSuCo,
  isSuCoOpenCycleStation,
  SU_CO_OPEN_CYCLE_STATIONS,
  toSuCoOpenCycleInput,
} from "./cssd-su-co-set-eligibility";

describe("cssd-su-co-set-eligibility", () => {
  it("keeps every processing station including CAP_PHAT before clinical use", () => {
    for (const station of SU_CO_OPEN_CYCLE_STATIONS) {
      expect(
        isOpenCycleEligibleForSuCo({ isActive: true, stationCode: station, maCaMoId: null }),
      ).toBe(true);
    }
  });

  it("keeps open CAP_PHAT when the set was issued to a khoa but not used clinically", () => {
    const input = toSuCoOpenCycleInput({
      is_active: true,
      ma_trang_thai_hien_tai: "CAP_PHAT",
      ma_ca_mo_id: null,
      khoa_nhan_id: "khoa-phong-mo",
    });
    expect(isCssdCycleUsedClinically(input)).toBe(false);
    expect(isOpenCycleEligibleForSuCo(input)).toBe(true);
  });

  it("drops CAP_PHAT once used clinically even while the station stays CAP_PHAT", () => {
    const input = toSuCoOpenCycleInput({
      is_active: true,
      ma_trang_thai_hien_tai: "CAP_PHAT",
      ma_ca_mo_id: "MO-2026-014",
      khoa_nhan_id: "khoa-phong-mo",
    });
    expect(isCssdCycleUsedClinically(input)).toBe(true);
    expect(isOpenCycleEligibleForSuCo(input)).toBe(false);
    expect(explainSuCoSetOut(input)).toMatch(/đã sử dụng tại khoa/);
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
