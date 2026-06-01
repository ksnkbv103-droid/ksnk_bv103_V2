import { describe, expect, it } from "vitest";
import { calculateGscComplianceScore, classifyGscCompliance, gscComplianceDisplay } from "./giam-sat-chung.domain";
import { ChecklistResult } from "@/types/giam-sat-chung";

describe("calculateGscComplianceScore", () => {
  it("returns 0 if results list is empty or undefined", () => {
    expect(calculateGscComplianceScore([])).toBe(0);
    expect(calculateGscComplianceScore(null as any)).toBe(0);
  });

  it("returns 0 if all results are NA", () => {
    const results: ChecklistResult[] = [
      { criterionId: "1", value: "NA" },
      { criterionId: "2", value: "NA" },
    ];
    expect(calculateGscComplianceScore(results)).toBe(0);
  });

  it("calculates correct compliance with default MAJOR weights when no weightType is specified", () => {
    const results: ChecklistResult[] = [
      { criterionId: "1", value: "DAT" },      // weight 5 (default)
      { criterionId: "2", value: "DAT" },      // weight 5 (default)
      { criterionId: "3", value: "KHONG_DAT" }, // weight 5 (default)
    ];
    // Earned: 5 + 5 = 10. Max: 15. Score: 10/15 = 66.67% -> 67%
    expect(calculateGscComplianceScore(results)).toBe(67);
  });

  it("calculates correct compliance using explicit weighted values", () => {
    const results: ChecklistResult[] = [
      { criterionId: "1", value: "DAT", weightType: "CRITICAL" }, // weight 10
      { criterionId: "2", value: "DAT", weightType: "MINOR" },    // weight 1
      { criterionId: "3", value: "KHONG_DAT", weightType: "MAJOR" }, // weight 5
      { criterionId: "4", value: "NA", weightType: "CRITICAL" },   // ignored
    ];
    // Earned: 10 + 1 = 11. Max: 10 + 1 + 5 = 16. Score: 11/16 = 68.75% -> 69%
    expect(calculateGscComplianceScore(results)).toBe(69);
  });

  it("immediately returns 0% compliance if any Red Flag criterion is KHONG_DAT", () => {
    const results: ChecklistResult[] = [
      { criterionId: "1", value: "DAT", weightType: "CRITICAL" },
      { criterionId: "2", value: "DAT", weightType: "MINOR" },
      { criterionId: "3", value: "KHONG_DAT", weightType: "CRITICAL", isRedFlag: true }, // Red flag violated!
    ];
    expect(calculateGscComplianceScore(results)).toBe(0);
  });

  it("does not trigger Red Flag rule if Red Flag criterion is DAT or NA", () => {
    const results: ChecklistResult[] = [
      { criterionId: "1", value: "DAT", weightType: "CRITICAL", isRedFlag: true }, // DAT, no violation
      { criterionId: "2", value: "NA", weightType: "CRITICAL", isRedFlag: true },  // NA, no violation
      { criterionId: "3", value: "KHONG_DAT", weightType: "MINOR" }, // weight 1
    ];
    // Earned: 10. Max: 10 + 1 = 11. Score: 10/11 = 90.9% -> 91%
    expect(calculateGscComplianceScore(results)).toBe(91);
  });
});

describe("classifyGscCompliance", () => {
  it("classifies score >= 90 as TOT", () => {
    expect(classifyGscCompliance(90)).toBe("TOT");
    expect(classifyGscCompliance(95)).toBe("TOT");
    expect(classifyGscCompliance(100)).toBe("TOT");
  });

  it("classifies score >= 80 and < 90 as DAT", () => {
    expect(classifyGscCompliance(80)).toBe("DAT");
    expect(classifyGscCompliance(85)).toBe("DAT");
    expect(classifyGscCompliance(89)).toBe("DAT");
  });

  it("classifies score < 80 as KHONG_DAT", () => {
    expect(classifyGscCompliance(0)).toBe("KHONG_DAT");
    expect(classifyGscCompliance(50)).toBe("KHONG_DAT");
    expect(classifyGscCompliance(79)).toBe("KHONG_DAT");
  });
});

describe("gscComplianceDisplay", () => {
  it("maps score to label and styling tier", () => {
    expect(gscComplianceDisplay(95)).toEqual({ label: "Tốt", className: "text-emerald-700" });
    expect(gscComplianceDisplay(85)).toEqual({ label: "Đạt", className: "text-amber-600" });
    expect(gscComplianceDisplay(50)).toEqual({ label: "Không đạt", className: "text-red-600" });
  });
});
