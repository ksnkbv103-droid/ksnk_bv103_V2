import { describe, expect, it } from "vitest";
import { buildNkbvBaAnalysisDraftRow, isNkbvBaAnalysisDraftId } from "./nkbv-ba-analysis-draft";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

describe("nkbv-ba-analysis-draft", () => {
  it("tạo nháp neo mốc Index — id draft:", () => {
    const m: BaTimelineMilestone = {
      id: "lis:abc",
      source: "LIS",
      date: "2026-08-01",
      kind: "LIS",
      title: "Cấy máu",
      detail: null,
      loai_benh_pham: "Máu",
      majorType: "BSI",
      gate: "BSI",
    };
    const row = buildNkbvBaAnalysisDraftRow({
      stay: {
        ma_benh_an: "BA1",
        ma_benh_nhan: "P1",
        ho_ten_benh_nhan: "A",
        ngay_vao_vien: "2026-07-28",
      },
      milestone: m,
      gate: "BSI",
    });
    expect(isNkbvBaAnalysisDraftId(row.id)).toBe(true);
    expect(row.ngay_phat_hien).toBe("2026-08-01");
    expect(row.loai_benh_pham).toBe("Máu");
    expect(row._draft_milestone_id).toBe("lis:abc");
  });
});
