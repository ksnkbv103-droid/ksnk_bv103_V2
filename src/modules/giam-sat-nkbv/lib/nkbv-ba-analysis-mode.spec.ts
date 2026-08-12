import { describe, expect, it } from "vitest";
import {
  BA_ANALYSIS_MODE_DEFAULT,
  analysisModePrefKey,
  isBaAnalysisMode,
  isManualAnalysisMode,
  parseBaAnalysisMode,
  resolveManualKetLuanDisplay,
} from "./nkbv-ba-analysis-mode";

describe("nkbv-ba-analysis-mode", () => {
  it("defaults to CDC", () => {
    expect(BA_ANALYSIS_MODE_DEFAULT).toBe("CDC");
    expect(parseBaAnalysisMode(undefined)).toBe("CDC");
    expect(parseBaAnalysisMode("nope")).toBe("CDC");
  });

  it("accepts CDC | MANUAL", () => {
    expect(isBaAnalysisMode("CDC")).toBe(true);
    expect(isBaAnalysisMode("MANUAL")).toBe(true);
    expect(parseBaAnalysisMode("MANUAL")).toBe("MANUAL");
  });

  it("pref key scopes by ma BA", () => {
    expect(analysisModePrefKey("BA001")).toBe("nkbv-ba-analysis-mode:BA001");
  });

  it("isManualAnalysisMode", () => {
    expect(isManualAnalysisMode("MANUAL")).toBe(true);
    expect(isManualAnalysisMode("CDC")).toBe(false);
    expect(isManualAnalysisMode(null)).toBe(false);
  });

  it("resolveManualKetLuanDisplay ignores empty", () => {
    expect(resolveManualKetLuanDisplay("")).toBe("");
    expect(resolveManualKetLuanDisplay("  ")).toBe("");
    expect(resolveManualKetLuanDisplay("Nghi CAUTI")).toBe("Nghi CAUTI");
  });
});
