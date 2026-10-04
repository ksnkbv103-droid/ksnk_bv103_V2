import { describe, expect, it } from "vitest";
import {
  buildAnalyticsFilterPayload,
  effectiveFilterIds,
  sortedJoinIds,
} from "@/lib/analytics/filter-helpers";

const baseArgs = {
  tuNgay: "2026-01-01",
  denNgay: "2026-01-31",
  selectedKhoiIds: [] as string[],
  selectedKhoaIds: [] as string[],
  selectedNgheIds: [] as string[],
  selectedKhuVucIds: [] as string[],
  selectedHinhThucIds: ["CHEO"] as string[],
  selectedBangKiemMas: [] as string[],
  khoiOptionCount: 0,
  khoaOptionCount: 0,
  ngheOptionCount: 0,
  khuOptionCount: 0,
};

describe("analytics filter helpers", () => {
  it("effectiveFilterIds returns null when all selected", () => {
    expect(effectiveFilterIds(["a", "b"], 2)).toBeNull();
  });

  it("sortedJoinIds is stable", () => {
    expect(sortedJoinIds(["b", "a"])).toBe(sortedJoinIds(["a", "b"]));
  });

  it("hinhThucIdsOverride wins over selected (GS-02 lens)", () => {
    const fp = buildAnalyticsFilterPayload({
      ...baseArgs,
      hinhThucIdsOverride: ["KSNK"],
    });
    expect(fp.hinh_thuc_ids).toEqual(["KSNK"]);
  });
});
