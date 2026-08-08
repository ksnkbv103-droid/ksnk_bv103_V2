import { describe, expect, it } from "vitest";
import {
  formatGscHistoryScore,
  gscCompliancePercentFromCounts,
  previewGscFormProgress,
  resolveGscHistoryCompliancePercent,
} from "./gsc-score-display";
import type { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";

const criteria: ChecklistCriterion[] = [
  { id: "a", label: "A", la_then_chot: true },
  { id: "b", label: "B" },
];

describe("previewGscFormProgress", () => {
  it("TY_LE uses percent label", () => {
    const results: ChecklistResult[] = [
      { criterionId: "a", value: "DAT" },
      { criterionId: "b", value: "KHONG_DAT" },
    ];
    const p = previewGscFormProgress(results, criteria, "TY_LE");
    expect(p.rate).toBe(50);
    expect(p.scoreLabel).toContain("50.00%");
    expect(p.scoreLabel).not.toMatch(/100%/);
  });

  it("NHAT_KY does not show percent rate", () => {
    const results: ChecklistResult[] = [
      { criterionId: "a", value: "NA", gia_tri_so: 99 },
    ];
    const c: ChecklistCriterion[] = [
      { id: "a", label: "T", kieu_du_lieu: "SO_LIEU", nguong_min: 0, nguong_max: 50 },
    ];
    const p = previewGscFormProgress(results, c, "NHAT_KY");
    expect(p.rate).toBeNull();
    expect(p.scoreLabel).toContain("ngoài ngưỡng");
  });

  it("TRON_GOI shows percent only (bundle flag kept in field, not label)", () => {
    const results: ChecklistResult[] = [
      { criterionId: "a", value: "DAT" },
      { criterionId: "b", value: "KHONG_DAT" },
    ];
    const p = previewGscFormProgress(results, criteria, "TRON_GOI");
    expect(p.rate).toBe(50);
    expect(p.scoreLabel).toContain("50.00%");
    expect(p.scoreLabel).not.toMatch(/Bundle|100%/);
    expect(p.careBundlePass).toBe(true);
  });

  it("DAT_KHONG_DAT shows percent only — no Đủ/Chưa đủ 100%", () => {
    const results: ChecklistResult[] = [
      { criterionId: "a", value: "DAT" },
      { criterionId: "b", value: "KHONG_DAT" },
    ];
    const p = previewGscFormProgress(results, criteria, "DAT_KHONG_DAT");
    expect(p.rate).toBe(50);
    expect(p.scoreLabel).toContain("50.00%");
    expect(p.scoreLabel).not.toMatch(/Đủ 100%|Chưa đủ 100%/);
  });
});

describe("formatGscHistoryScore", () => {
  it("formats TY_LE from tong_quan_sat/tong_dat", () => {
    const d = formatGscHistoryScore({
      cach_tinh_diem: "TY_LE",
      tong_quan_sat: 3,
      tong_dat: 2,
      tong_diem: 67,
    });
    expect(d.label).toContain("66.67%");
  });

  it("formats TRON_GOI as percent only", () => {
    const d = formatGscHistoryScore({
      cach_tinh_diem: "TRON_GOI",
      tong_quan_sat: 4,
      tong_dat: 3,
      dat_tron_goi: false,
      tong_diem: 75,
    });
    expect(d.label).toContain("75.00%");
    expect(d.label).not.toMatch(/Bundle/);
  });

  it("formats DAT_KHONG_DAT as percent only", () => {
    const d = formatGscHistoryScore({
      cach_tinh_diem: "DAT_KHONG_DAT",
      tong_quan_sat: 8,
      tong_dat: 7,
      tong_diem: 87.5,
    });
    expect(d.label).toContain("87.50%");
    expect(d.label).not.toMatch(/Đủ 100%|Chưa đủ 100%/);
  });

  it("formats NHAT_KY without percent", () => {
    const d = formatGscHistoryScore({
      loai_giam_sat: "NHAT_KY_VAN_HANH",
      tong_diem: null,
    });
    expect(d.label).toContain("Nhật ký");
  });
});

describe("gscCompliancePercentFromCounts", () => {
  it("returns null when denominator is zero", () => {
    expect(gscCompliancePercentFromCounts(0, 0)).toBeNull();
  });

  it("matches dashboard ratio", () => {
    expect(gscCompliancePercentFromCounts(8, 7)).toBe(87.5);
  });
});

describe("resolveGscHistoryCompliancePercent", () => {
  it("returns percent for TRON_GOI from counts", () => {
    expect(
      resolveGscHistoryCompliancePercent(
        { tong_quan_sat: 2, tong_dat: 1, tong_diem: 50 },
        "TRON_GOI",
      ),
    ).toBe(50);
  });

  it("falls back to tong_diem percent", () => {
    expect(
      resolveGscHistoryCompliancePercent({ tong_diem: 87.5 }, "TY_LE"),
    ).toBe(87.5);
  });
});
