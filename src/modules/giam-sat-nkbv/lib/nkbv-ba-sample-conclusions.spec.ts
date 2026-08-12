import { describe, expect, it } from "vitest";
import {
  findBaSampleConclusion,
  filterOutSampleConclusions,
  normalizeSampleId,
  sampleConclusionsToDispositionRows,
  sampleIdsOwnedByAnalysisSession,
  type BaSampleConclusion,
} from "./nkbv-ba-sample-conclusions";
import { resolveViSinhAnalysisStatus } from "./nkbv-vi-sinh-analysis-status";

describe("nkbv-ba-sample-conclusions", () => {
  it("normalizeSampleId strips lis:", () => {
    expect(normalizeSampleId("lis:abc-1")).toBe("abc-1");
    expect(normalizeSampleId("abc-1")).toBe("abc-1");
  });

  it("find khớp lis: và bare id", () => {
    const rows: BaSampleConclusion[] = [
      {
        sampleId: "lis:u1",
        date: "2026-07-20",
        kind: "XN",
        disposition: "KHONG_DU_TC",
        label: "Không phải sự kiện tại ngày 20/7",
        updatedAt: "t",
      },
    ];
    expect(findBaSampleConclusion(rows, "u1")?.label).toMatch(/20\/7/);
    expect(findBaSampleConclusion(rows, "lis:u1")?.disposition).toBe("KHONG_DU_TC");
  });

  it("gộp disposition → resolve status khi PT Index khác", () => {
    const rows: BaSampleConclusion[] = [
      {
        sampleId: "lis:xn1",
        date: "2026-07-20",
        kind: "XN",
        disposition: "KHONG_DU_TC",
        label: "Không phải sự kiện tại ngày 20/7",
        updatedAt: "t",
      },
    ];
    const disp = sampleConclusionsToDispositionRows(rows);
    expect(resolveViSinhAnalysisStatus("lis:xn1", disp)).toBe("KHONG_DU_TC");
    expect(resolveViSinhAnalysisStatus("xn1", disp)).toBe("KHONG_DU_TC");
  });

  it("sampleIdsOwnedByAnalysisSession + filterOut khi xóa phiên", () => {
    const owned = sampleIdsOwnedByAnalysisSession({
      index: { id: "lis:u1", kind: "XN" },
      draft: {
        ritAttributedIds: ["lis:u2", "b1"],
        bloodCriterionIds: ["b1"],
      },
    });
    expect(owned.sort()).toEqual(["b1", "lis:u1", "lis:u2"].sort());
    const rows: BaSampleConclusion[] = [
      {
        sampleId: "lis:u1",
        date: "2026-07-20",
        kind: "XN",
        disposition: "KHONG_DU_TC",
        label: "a",
        updatedAt: "t",
      },
      {
        sampleId: "other",
        date: "2026-07-21",
        kind: "XN",
        disposition: "MANUAL",
        label: "keep",
        updatedAt: "t",
      },
    ];
    const next = filterOutSampleConclusions(
      rows,
      new Set(owned.map((id) => normalizeSampleId(id))),
    );
    expect(next.map((r) => r.sampleId)).toEqual(["other"]);
  });
});
