import { describe, expect, it } from "vitest";
import {
  effectiveSpecimenForAlgorithm,
  getSpecimenCanonical,
  isNkbvSpecimenCode,
  specimenSelectGroups,
} from "./nkbv-specimen-canonical";
import { resolveNkbvMajorType } from "./nkbv-major-type";
import { isBloodSpecimen } from "./nkbv-sbap-rit-chips";
import { specimenToSyndromePanel } from "./nkbv-specimen-syndrome";

describe("nkbv-specimen-canonical", () => {
  it("mọi mã trong dropdown có nhãn tiếng Việt", () => {
    const groups = specimenSelectGroups();
    expect(groups.length).toBeGreaterThanOrEqual(7);
    for (const g of groups) {
      for (const o of g.options) {
        expect(o.label.length).toBeGreaterThan(3);
        expect(isNkbvSpecimenCode(o.code)).toBe(true);
      }
    }
  });

  it("NCT tách khỏi Cấy máu", () => {
    expect(getSpecimenCanonical("BLOOD_CULTURE")?.label).toMatch(/Cấy máu/);
    expect(getSpecimenCanonical("BLOOD_NCT")?.label).toMatch(/NCT/);
    expect(getSpecimenCanonical("BLOOD_CULTURE")?.code).not.toBe(
      getSpecimenCanonical("BLOOD_NCT")?.code,
    );
  });

  it("hô hấp dùng thuật ngữ ETA/BAL/PBAL/PSB", () => {
    expect(getSpecimenCanonical("ETA")?.label).toContain("ETA");
    expect(getSpecimenCanonical("BAL")?.label).toContain("BAL");
    expect(getSpecimenCanonical("PBAL")?.label).toContain("PBAL");
    expect(getSpecimenCanonical("PSB")?.label).toContain("PSB");
    expect(getSpecimenCanonical("SPUTUM")?.label).toMatch(/Đờm/);
  });

  it("effectiveSpecimen ưu tiên mã chuẩn", () => {
    expect(
      effectiveSpecimenForAlgorithm({
        loai_benh_pham_chuan: "ETA",
        loai_benh_pham: "đờm qua nội khí quản",
      }),
    ).toBe("ETA");
    expect(
      effectiveSpecimenForAlgorithm({
        loai_benh_pham_chuan: null,
        loai_benh_pham: "đờm qua nội khí quản",
      }),
    ).toBe("đờm qua nội khí quản");
  });

  it("major / hội chứng / máu theo mã chuẩn", () => {
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "BLOOD_CULTURE" })).toBe("BSI");
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "BLOOD_NCT" })).toBe("BSI");
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "ETA" })).toBe("PNEU");
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "URINE" })).toBe("UTI");
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "SURGICAL_SITE_FLUID" })).toBe("SSI");
    expect(resolveNkbvMajorType({ loai_benh_pham_chuan: "URT" })).toBe("OTHER");
    expect(resolveNkbvMajorType({ loai_benh_pham: "ETA" })).toBe("PNEU");
    expect(specimenToSyndromePanel({ loai_benh_pham: "ETA" })).toBe("PNEU");
    expect(specimenToSyndromePanel({ loai_benh_pham_chuan: "URT" })).toBeNull();
    expect(
      specimenToSyndromePanel({
        loai_benh_pham_chuan: "SURGICAL_SITE_FLUID",
        lis_goc: "Dịch / mô thận (không phải nước tiểu)",
      }),
    ).toBeNull();
    expect(isBloodSpecimen("BLOOD_CULTURE")).toBe(true);
    expect(isBloodSpecimen("BLOOD_NCT")).toBe(true);
    expect(isBloodSpecimen("ETA")).toBe(false);
  });
});
