import { describe, expect, it } from "vitest";
import { pmDueLabel, pmDueStatus } from "./cssd-equipment-pm";
import { allChecklistDone, buildPmChecklistForLoaiMay } from "./cssd-equipment-pm-checklist";

describe("cssd-equipment-pm", () => {
  it("flags overdue PM", () => {
    expect(pmDueStatus("2026-01-01", "2026-06-27")).toBe("QUA_HAN");
    expect(pmDueLabel("QUA_HAN")).toContain("Quá hạn");
  });

  it("flags due within 7 days", () => {
    expect(pmDueStatus("2026-06-30", "2026-06-27")).toBe("SAP_DEN");
  });

  it("builds checklist for steam sterilizer", () => {
    const items = buildPmChecklistForLoaiMay("LM_HOI_NUOC");
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(allChecklistDone(items.map((x) => ({ ...x, done: true })))).toBe(true);
  });
});
