import { describe, expect, it } from "vitest";
import {
  ch17CriterionVisibleForAge,
  coerceAdultPatientAge,
  pneuAgeUiBranchFromAge,
  resolveIsInfantLe1Flag,
  showInfantCriteriaUi,
} from "./nkbv-age-ui";

describe("nkbv-age-ui — BV người lớn ẩn nhi theo DOB", () => {
  it("thiếu tuổi / người lớn → ẩn infant UI", () => {
    expect(showInfantCriteriaUi(null)).toBe(false);
    expect(showInfantCriteriaUi(undefined)).toBe(false);
    expect(showInfantCriteriaUi(45)).toBe(false);
    expect(showInfantCriteriaUi(2)).toBe(false);
    expect(resolveIsInfantLe1Flag(null)).toBe(false);
  });

  it("≤1 tuổi → hiện infant UI", () => {
    expect(showInfantCriteriaUi(0)).toBe(true);
    expect(showInfantCriteriaUi(1)).toBe(true);
    expect(resolveIsInfantLe1Flag(1)).toBe(true);
  });

  it("PNEU: thiếu DOB luôn ADULT; 1–12 / ≤1 theo tuổi", () => {
    expect(pneuAgeUiBranchFromAge(null)).toBe("ADULT");
    expect(pneuAgeUiBranchFromAge(0)).toBe("INFANT_LE1");
    expect(pneuAgeUiBranchFromAge(1)).toBe("INFANT_LE1");
    expect(pneuAgeUiBranchFromAge(8)).toBe("CHILD_1_12");
    expect(pneuAgeUiBranchFromAge(40)).toBe("ADULT");
  });

  it("coerce patient_age: thiếu DOB + tuổi ≤12 → 45", () => {
    expect(coerceAdultPatientAge(null, 5)).toBe(45);
    expect(coerceAdultPatientAge(null, 0)).toBe(45);
    expect(coerceAdultPatientAge(null, 30)).toBe(30);
    expect(coerceAdultPatientAge(8, 99)).toBe(8);
  });

  it("Ch.17 ageGate visibility", () => {
    const infant = {
      kind: "ageGate" as const,
      age: "INFANT_LE1" as const,
      of: { kind: "evidence" as const, key: "sx_apnea" },
    };
    const adult = {
      kind: "ageGate" as const,
      age: "OVER_1Y" as const,
      of: { kind: "evidence" as const, key: "sx_fever_gt38" },
    };
    expect(ch17CriterionVisibleForAge(infant, false)).toBe(false);
    expect(ch17CriterionVisibleForAge(infant, true)).toBe(true);
    expect(ch17CriterionVisibleForAge(adult, false)).toBe(true);
    expect(ch17CriterionVisibleForAge(adult, true)).toBe(false);
    expect(
      ch17CriterionVisibleForAge({ kind: "evidence", key: "micro_csf_positive" }, false),
    ).toBe(true);
  });
});
