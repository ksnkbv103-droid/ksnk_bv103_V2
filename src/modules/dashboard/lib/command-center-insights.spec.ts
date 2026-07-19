import { describe, expect, it } from "vitest";
import { buildCommandCenterInsights } from "./command-center-insights";

describe("buildCommandCenterInsights", () => {
  it("ưu tiên gap comparable lớn và BK yếu", () => {
    const insights = buildCommandCenterInsights({
      vstGaps: [
        { ten: "Khoa A", tgs_quan_sat: 10, ksnk_quan_sat: 10, ty_le_tgs: 90, ty_le_ksnk: 70, do_lech: 20 },
      ],
      gscGaps: [],
      checklistOverview: [
        { ma_bk: "BK01", ten_bang_kiem: "Vệ sinh bề mặt", ty_le_tuan_thu: 60, tong_vi_pham: 5 },
      ],
      thongKeVstHref: "/thong-ke/vst",
      thongKeGscHref: "/thong-ke/gsc",
    });
    expect(insights.length).toBeGreaterThanOrEqual(2);
    expect(insights[0].text).toMatch(/Khoa A/);
    expect(insights.some((i) => i.text.includes("Vệ sinh bề mặt"))).toBe(true);
  });

  it("fallback khi không có tín hiệu", () => {
    const insights = buildCommandCenterInsights({
      vstGaps: [],
      gscGaps: [],
      checklistOverview: [],
      thongKeVstHref: "/thong-ke/vst",
      thongKeGscHref: "/thong-ke/gsc",
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe("ok-baseline");
  });
});
