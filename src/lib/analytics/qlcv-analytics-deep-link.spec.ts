import { describe, expect, it } from "vitest";
import { buildQlcvAnalyticsDeepLink, buildQlcvAnalyticsPrefill } from "./qlcv-analytics-deep-link";

describe("qlcv-analytics-deep-link", () => {
  it("mặc định mở create=1", () => {
    const href = buildQlcvAnalyticsDeepLink({
      topic: "Bao phủ TGS",
      gap: "Thiếu TGS",
      khoaLabel: "Khoa A",
      bkLabel: "BK01",
    });
    expect(href).toContain("from=analytics");
    expect(href).toContain("create=1");
    expect(href).toContain("khoa=Khoa");
  });

  it("prefill tiêu đề có khoa + gap", () => {
    const p = buildQlcvAnalyticsPrefill({
      topic: "Bao phủ TGS · KA",
      gap: "Thiếu TGS",
      khoa: "KA",
      bk: "BK01, BK02",
    });
    expect(p.tieu_de).toMatch(/Thiếu TGS/);
    expect(p.mo_ta).toMatch(/BK01/);
  });
});
