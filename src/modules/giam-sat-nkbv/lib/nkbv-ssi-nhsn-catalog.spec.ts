import { describe, expect, it } from "vitest";
import {
  formatNhsnOptionLabel,
  getNhsnProcedure,
  isOrganSpaceSiteAllowedForProcedure,
  NKBV_NHSN_ORGAN_SPACE_SITES,
  NKBV_NHSN_PROCEDURES,
  NKBV_NHSN_SSI_EVENT_TYPES,
  organSpaceSitesForProcedure,
  resolveSsiSurveillanceDays,
  secondaryIncisionMismatchWarning,
  softWarnMauSoSurgery,
} from "./nkbv-ssi-nhsn-catalog";

describe("nkbv-ssi-nhsn-catalog", () => {
  it("đủ 3 trường code/en/vi trên mọi dòng", () => {
    for (const row of [
      ...NKBV_NHSN_PROCEDURES,
      ...NKBV_NHSN_SSI_EVENT_TYPES,
      ...NKBV_NHSN_ORGAN_SPACE_SITES,
    ]) {
      expect(row.code.trim()).toBeTruthy();
      expect(row.name_en.trim()).toBeTruthy();
      expect(row.name_vi.trim()).toBeTruthy();
    }
  });

  it("namespace PT vs Organ site tách biệt dù cùng chữ BRST/CARD", () => {
    expect(getNhsnProcedure("BRST")?.deep_organ_surveillance_days).toBe(90);
    expect(NKBV_NHSN_ORGAN_SPACE_SITES.some((s) => s.code === "BRST")).toBe(true);
    expect(formatNhsnOptionLabel(getNhsnProcedure("BRST")!)).toMatch(/^BRST —/);
  });

  it("SP: nông luôn 30; Deep/Organ theo mã PT; DIS luôn 30; fallback implant", () => {
    expect(
      resolveSsiSurveillanceDays({ depth: "SUPERFICIAL", procedureCode: "KPRO" }),
    ).toBe(30);
    expect(
      resolveSsiSurveillanceDays({ depth: "DEEP", procedureCode: "COLO" }),
    ).toBe(30);
    expect(
      resolveSsiSurveillanceDays({ depth: "DEEP", procedureCode: "KPRO" }),
    ).toBe(90);
    expect(
      resolveSsiSurveillanceDays({
        depth: "DEEP",
        procedureCode: "CBGB",
        eventTypeCode: "DIS",
      }),
    ).toBe(30);
    expect(
      resolveSsiSurveillanceDays({
        depth: "ORGAN_SPACE",
        procedureCode: "",
        hasImplantFallback: true,
      }),
    ).toBe(90);
  });

  it("PJI chỉ HPRO/KPRO; VCUF chỉ HYST/VHYS", () => {
    expect(isOrganSpaceSiteAllowedForProcedure("PJI", "KPRO")).toBe(true);
    expect(isOrganSpaceSiteAllowedForProcedure("PJI", "COLO")).toBe(false);
    expect(isOrganSpaceSiteAllowedForProcedure("VCUF", "HYST")).toBe(true);
    expect(isOrganSpaceSiteAllowedForProcedure("VCUF", "COLO")).toBe(false);
    expect(organSpaceSitesForProcedure("COLO").some((s) => s.code === "PJI")).toBe(
      false,
    );
    expect(organSpaceSitesForProcedure("KPRO").some((s) => s.code === "PJI")).toBe(
      true,
    );
  });

  it("cảnh báo SIS/DIS khi PT không có đường mổ phụ; CBGB OK", () => {
    expect(secondaryIncisionMismatchWarning("DIS", "COLO")).toMatch(/không có đường mổ phụ/i);
    expect(secondaryIncisionMismatchWarning("DIS", "CBGB")).toBeNull();
  });

  it("soft-gate mẫu số: Clean cấm COLO; duration <5", () => {
    const clean = softWarnMauSoSurgery({
      loai_phau_thuat_nhsn: "COLO",
      phan_loai_vet_mo: "SACH",
      thoi_gian_mo_phut: 90,
    });
    expect(clean.some((w) => w.code === "WOUND_CLEAN_FORBIDDEN")).toBe(true);
    const short = softWarnMauSoSurgery({
      loai_phau_thuat_nhsn: "KPRO",
      phan_loai_vet_mo: "SACH",
      thoi_gian_mo_phut: 3,
    });
    expect(short.some((w) => w.code === "DURATION_LT_5")).toBe(true);
  });
});
