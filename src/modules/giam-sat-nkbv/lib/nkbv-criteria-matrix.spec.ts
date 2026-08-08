import { describe, expect, it } from "vitest";
import { buildCriteriaMatrixState, summarizeCriteriaGaps } from "./nkbv-criteria-matrix";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

describe("buildCriteriaMatrixState PNEU", () => {
  it("XQ + đờm trong IWP đánh dấu imaging và resp_culture PRESENT", () => {
    const milestones: BaTimelineMilestone[] = [
      {
        id: "lis:1",
        source: "LIS",
        date: "2026-05-20",
        kind: "LIS",
        title: "Đờm",
        detail: "K. pneumoniae",
        loai_benh_pham: "Đờm",
        tac_nhan: "K. pneumoniae",
        majorType: "PNEU",
        gate: "HAP",
      },
      {
        id: "manual:x",
        source: "MANUAL",
        date: "2026-05-21",
        kind: "IMAGING_CHEST",
        title: "XQ/CT phổi thâm nhiễm",
        detail: null,
        criteriaKey: "imaging_chest",
        majorType: "PNEU",
        gate: "HAP",
      },
    ];
    const rows = buildCriteriaMatrixState({
      gate: "HAP",
      windowStart: "2026-05-17",
      windowEnd: "2026-05-23",
      indexMilestoneId: "lis:1",
      milestones,
    });
    expect(rows.find((r) => r.key === "imaging_chest")?.status).toBe("PRESENT");
    expect(rows.find((r) => r.key === "resp_culture")?.status).toBe("PRESENT");
    expect(rows.find((r) => r.key === "fever_or_wbc")?.status).toBe("MISSING");
    const gaps = summarizeCriteriaGaps(rows);
    expect(gaps.some((g) => /Sốt|WBC/i.test(g))).toBe(true);
    expect(gaps.some((g) => /Hô hấp tại chỗ/i.test(g))).toBe(true);
  });
});
