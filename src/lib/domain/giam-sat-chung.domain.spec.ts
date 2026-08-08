import { describe, expect, it } from "vitest";
import { classifyGscCompliance, gscComplianceDisplay } from "./giam-sat-chung.domain";

describe("classifyGscCompliance", () => {
  it("TOT at >= 90", () => {
    expect(classifyGscCompliance(90)).toBe("TOT");
    expect(classifyGscCompliance(95)).toBe("TOT");
    expect(classifyGscCompliance(100)).toBe("TOT");
  });

  it("DAT at 80..89", () => {
    expect(classifyGscCompliance(80)).toBe("DAT");
    expect(classifyGscCompliance(85)).toBe("DAT");
    expect(classifyGscCompliance(89)).toBe("DAT");
  });

  it("KHONG_DAT below 80", () => {
    expect(classifyGscCompliance(0)).toBe("KHONG_DAT");
    expect(classifyGscCompliance(50)).toBe("KHONG_DAT");
    expect(classifyGscCompliance(79)).toBe("KHONG_DAT");
  });
});

describe("gscComplianceDisplay", () => {
  it("maps tiers to labels", () => {
    expect(gscComplianceDisplay(95)).toEqual({ label: "Tốt", className: "text-emerald-700" });
    expect(gscComplianceDisplay(85)).toEqual({ label: "Đạt", className: "text-amber-600" });
    expect(gscComplianceDisplay(50)).toEqual({ label: "Không đạt", className: "text-red-600" });
  });
});
