import { describe, expect, it } from "vitest";
import { cdhaPrintLines } from "./nkbv-cdha-print";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

const m = (o: Partial<BaTimelineMilestone>) => ({ id: "x", source: "MANUAL", date: "2026-08-16", kind: "IMAGING_CHEST", title: "XQ phổi", detail: null, majorType: "OTHER", gate: null, ...o }) as unknown as BaTimelineMilestone;

describe("cdhaPrintLines", () => {
  it("chỉ lấy mốc IMAGING, sắp theo ngày, kèm ghi chú", () => {
    const lines = cdhaPrintLines([
      m({ id: "b", date: "2026-08-18", title: "CT phổi", detail: "thâm nhiễm thùy dưới" }),
      m({ id: "c", kind: "FEVER", title: "Sốt" }),
      m({ id: "a", date: "2026-08-16" }),
    ]);
    expect(lines).toEqual(["16/08/2026 — XQ phổi", "18/08/2026 — CT phổi: thâm nhiễm thùy dưới"]);
  });

  it("không có CĐHA → mảng rỗng", () => {
    expect(cdhaPrintLines([m({ kind: "FEVER" })])).toEqual([]);
  });
});
