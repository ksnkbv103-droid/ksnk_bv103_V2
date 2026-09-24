import { describe, expect, it } from "vitest";
import {
  CSSD_CYCLE_NOT_USED_CLINICALLY_OR,
  clinicalUseFromQuyTrinhRow,
  isCssdCycleUsedClinically,
} from "./cssd-cycle-clinical-use";

describe("cssd-cycle-clinical-use §17.3", () => {
  it("is used clinically only when a surgical case or patient id is attached", () => {
    expect(isCssdCycleUsedClinically({ maCaMoId: "MO-2026-014" })).toBe(true);
    expect(isCssdCycleUsedClinically({ maCaMoId: "  BN-12  " })).toBe(true);
  });

  it("stays unused when the case id is missing or blank", () => {
    expect(isCssdCycleUsedClinically({ maCaMoId: null })).toBe(false);
    expect(isCssdCycleUsedClinically({ maCaMoId: "   " })).toBe(false);
    expect(isCssdCycleUsedClinically({})).toBe(false);
  });

  it("does not treat khoa nhận as clinical use", () => {
    const row = clinicalUseFromQuyTrinhRow({
      ma_ca_mo_id: null,
      khoa_nhan_id: "khoa-phong-mo",
    });
    expect(isCssdCycleUsedClinically(row)).toBe(false);
    expect(
      isCssdCycleUsedClinically({ maCaMoId: "MO-1", khoaNhanId: "khoa-phong-mo" }),
    ).toBe(true);
  });

  it("prefilter names ma_ca_mo_id and not khoa_nhan_id", () => {
    expect(CSSD_CYCLE_NOT_USED_CLINICALLY_OR).toContain("ma_ca_mo_id");
    expect(CSSD_CYCLE_NOT_USED_CLINICALLY_OR).not.toContain("khoa_nhan");
  });
});
