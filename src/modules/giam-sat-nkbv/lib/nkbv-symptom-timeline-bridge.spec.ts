import { describe, expect, it } from "vitest";
import {
  dateInInclusiveWindow,
  isBaFactorMilestone,
  isBaIndexMilestone,
  prefillSymptomDatesFromTimeline,
  timelineMilestoneToSymptomPatch,
} from "./nkbv-symptom-timeline-bridge";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

function m(partial: Partial<BaTimelineMilestone> & Pick<BaTimelineMilestone, "id" | "date" | "title">): BaTimelineMilestone {
  return {
    source: "MANUAL",
    kind: "SYMPTOM",
    detail: null,
    majorType: "PNEU",
    gate: "HAP",
    criteriaKey: "fever",
    ...partial,
  };
}

describe("nkbv-symptom-timeline-bridge", () => {
  it("LIS / XQ = Index; sốt = factor", () => {
    expect(
      isBaIndexMilestone(
        m({ id: "1", date: "2026-08-01", title: "Cấy", source: "LIS", kind: "LIS", criteriaKey: null }),
      ),
    ).toBe(true);
    expect(
      isBaIndexMilestone(
        m({
          id: "2",
          date: "2026-08-01",
          title: "XQ",
          kind: "IMAGING_CHEST",
          criteriaKey: "imaging_chest",
        }),
      ),
    ).toBe(true);
    expect(
      isBaIndexMilestone(
        m({ id: "3", date: "2026-08-01", title: "Sốt", criteriaKey: "fever", kind: "SYMPTOM" }),
      ),
    ).toBe(false);
    expect(
      isBaFactorMilestone(
        m({ id: "3", date: "2026-08-01", title: "Sốt", criteriaKey: "fever", kind: "SYMPTOM" }),
      ),
    ).toBe(true);
  });

  it("map mốc sốt → has_fever", () => {
    const patch = timelineMilestoneToSymptomPatch(
      m({ id: "f", date: "2026-08-02", title: "Sốt", criteriaKey: "fever" }),
    );
    expect(patch).toEqual({ key: "has_fever", date: "2026-08-02", label: "Sốt" });
  });

  it("prefill không ghi đè ngày đã có; tôn trọng IWP", () => {
    const milestones = [
      m({ id: "a", date: "2026-08-01", title: "Sốt", criteriaKey: "fever" }),
      m({
        id: "b",
        date: "2026-08-10",
        title: "XQ",
        criteriaKey: "imaging_chest",
        kind: "IMAGING_CHEST",
      }),
    ];
    const out = prefillSymptomDatesFromTimeline({
      milestones,
      iwpStart: "2026-08-01",
      iwpEnd: "2026-08-07",
      existing: { has_fever: "2026-08-03" },
    });
    expect(out.has_fever).toBe("2026-08-03");
    expect(out.has_chest_imaging_abnormal).toBeUndefined();
  });

  it("dateInInclusiveWindow", () => {
    expect(dateInInclusiveWindow("2026-08-03", "2026-08-01", "2026-08-07")).toBe(true);
    expect(dateInInclusiveWindow("2026-08-10", "2026-08-01", "2026-08-07")).toBe(false);
  });
});
