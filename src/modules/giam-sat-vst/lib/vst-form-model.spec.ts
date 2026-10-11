import { describe, expect, it } from "vitest";
import {
  VST_MAX_PERSONS_HARD,
  VST_MAX_PERSONS_NEW,
  createDefaultVSTFormPersons,
  createNewOpp,
  normalizeRecordTime,
} from "./vst-form-model";

describe("vst-form-model", () => {
  it("createNewOpp: cơ hội trống, chưa chọn hành động", () => {
    const o = createNewOpp();
    expect(o.thoi_diems).toEqual([]);
    expect(o.hanh_dong).toBeNull();
    expect(o.isCollapsed).toBe(false);
    expect(o.id.length).toBeGreaterThan(0);
  });

  it("createDefaultVSTFormPersons: mặc định 3 NVYT, mỗi người 1 cơ hội", () => {
    const ps = createDefaultVSTFormPersons();
    expect(ps).toHaveLength(VST_MAX_PERSONS_NEW);
    expect(ps.map((p) => p.id_col)).toEqual(["col1", "col2", "col3"]);
    expect(ps.every((p) => p.opportunities.length === 1)).toBe(true);
  });

  it("createDefaultVSTFormPersons: biên 1..8", () => {
    expect(createDefaultVSTFormPersons(0)).toHaveLength(1);
    expect(createDefaultVSTFormPersons(100)).toHaveLength(VST_MAX_PERSONS_HARD);
  });

  it("normalizeRecordTime: ISO giữ nguyên; HH:mm gắn vào ngày giám sát; rỗng trả ISO hiện tại", () => {
    expect(normalizeRecordTime("2026-01-02T03:04:05.000Z", "2026-01-01")).toBe("2026-01-02T03:04:05.000Z");
    const out = normalizeRecordTime("08:30", "2026-03-10");
    const d = new Date(out);
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
    expect(Number.isNaN(new Date(normalizeRecordTime(undefined, "2026-03-10")).getTime())).toBe(false);
  });
});
