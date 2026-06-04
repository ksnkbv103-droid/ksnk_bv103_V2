import { describe, expect, it } from "vitest";
import { formatGscHistoryScore, previewGscFormProgress } from "./gsc-score-display";
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
});

describe("formatGscHistoryScore", () => {
  it("formats TY_LE from tong_quan_sat/tong_dat (2 decimals)", () => {
    const d = formatGscHistoryScore({
      cach_tinh_diem: "TY_LE",
      tong_quan_sat: 3,
      tong_dat: 2,
      tong_diem: 67,
    });
    expect(d.label).toContain("66.67%");
  });

  it("formats TRON_GOI as percent", () => {
    const d = formatGscHistoryScore({
      cach_tinh_diem: "TRON_GOI",
      dat_tron_goi: true,
      tong_diem: 100,
    });
    expect(d.label).toContain("100.00%");
  });

  it("formats NHAT_KY without percent", () => {
    const d = formatGscHistoryScore({
      loai_giam_sat: "NHAT_KY_VAN_HANH",
      tong_diem: null,
    });
    expect(d.label).toContain("Nhật ký");
  });
});
