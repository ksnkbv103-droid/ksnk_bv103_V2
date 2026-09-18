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
  it("ép tuổi <13 → 45", () => {
    expect(coerceAdultPatientAge(null, 5)).toBe(45);
    expect(coerceAdultPatientAge(30, 5)).toBe(30);
  });
  it("Ch.17 chỉ hiện OVER_1Y", () => {
    expect(
      ch17CriterionVisibleForAge({ kind: "ageGate", age: "OVER_1Y", of: { kind: "allOf", items: [] } } as never),
    ).toBe(true);
  });
});
