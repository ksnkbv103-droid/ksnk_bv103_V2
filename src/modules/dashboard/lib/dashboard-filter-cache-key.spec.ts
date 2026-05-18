import { describe, expect, it } from "vitest";
import { buildDashboardFilterCacheKey } from "./dashboard-filter-cache-key";

describe("buildDashboardFilterCacheKey", () => {
  it("ổn định thứ tự id", () => {
    const base = {
      tuNgay: "2026-01-01",
      denNgay: "2026-01-31",
      activeTab: "ksnk",
      selectedKhoiIds: [] as string[],
      selectedKhoaIds: [] as string[],
      selectedNgheIds: [] as string[],
      selectedKhuVucIds: [] as string[],
    };
    const a = buildDashboardFilterCacheKey({ ...base, selectedBangKiemMas: ["b", "a"] });
    const b = buildDashboardFilterCacheKey({ ...base, selectedBangKiemMas: ["a", "b"] });
    expect(a).toBe(b);
  });
});
