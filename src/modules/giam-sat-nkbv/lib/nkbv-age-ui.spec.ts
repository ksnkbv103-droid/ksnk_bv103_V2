import { describe, expect, it } from "vitest";
import {
  ch17CriterionVisibleForAge,
  coerceAdultPatientAge,
  pneuAgeUiBranchFromAge,
} from "./nkbv-age-ui";

describe("nkbv-age-ui adult-only", () => {
  it("PNEU luôn ADULT", () => {
    expect(pneuAgeUiBranchFromAge(0.5)).toBe("ADULT");
    expect(pneuAgeUiBranchFromAge(40)).toBe("ADULT");
  });
  it("L02/20b: thiếu DOB/tuổi hợp lệ → null (không invent 45)", () => {
    expect(coerceAdultPatientAge(null, 5)).toBeNull();
    expect(coerceAdultPatientAge(null, null)).toBeNull();
    expect(coerceAdultPatientAge(null, undefined)).toBeNull();
    expect(coerceAdultPatientAge(30, 5)).toBe(30);
    expect(coerceAdultPatientAge(null, 40)).toBe(40);
  });
  it("Ch.17 chỉ hiện OVER_1Y", () => {
    expect(
      ch17CriterionVisibleForAge({ kind: "ageGate", age: "OVER_1Y", of: { kind: "allOf", items: [] } } as never),
    ).toBe(true);
  });
});
