import { describe, expect, it } from "vitest";
import { analyzeRunChart, describeRunSignal, medianOf } from "./supervision-run-chart";

describe("supervision-run-chart", () => {
  it("trung vị tính tay: lẻ và chẵn", () => {
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
    expect(medianOf([])).toBeNull();
  });

  it("chưa đủ 8 điểm → null", () => {
    expect(analyzeRunChart([50, 60, 70, 80, 90, 85, 80])).toBeNull();
  });

  it("dao động ngẫu nhiên → không có tín hiệu", () => {
    const r = analyzeRunChart([60, 80, 55, 85, 62, 78, 58, 82, 61, 79])!;
    expect(r.signals).toEqual([]);
  });

  it("chuỗi lệch: 6 tuần thấp rồi 6 tuần cao quanh trung vị", () => {
    // sắp xếp: 50 52 55 58 60 86 | 87 88 89 90 91 92 → trung vị = (86 + 87) / 2 = 86.5
    const r = analyzeRunChart([50, 55, 60, 58, 52, 86, 88, 90, 87, 89, 91, 92])!;
    expect(r.median).toBeCloseTo(86.5, 6);
    expect(r.signals.find((s) => s.kind === "shift" && s.direction === "down")).toMatchObject({ from: 0, to: 5 });
    expect(r.signals.find((s) => s.kind === "shift" && s.direction === "up")).toMatchObject({ from: 6, to: 11 });
  });

  it("điểm đúng trung vị không cắt chuỗi lệch", () => {
    // 13 điểm: sáu 60, một 70, sáu 80 → trung vị = 70 (điểm thứ 7). Điểm 70 nằm giữa dãy 80 nhưng bị bỏ qua.
    const r = analyzeRunChart([60, 60, 60, 60, 60, 60, 80, 80, 70, 80, 80, 80, 80])!;
    expect(r.median).toBe(70);
    expect(r.signals.find((s) => s.kind === "shift" && s.direction === "up")).toMatchObject({ from: 6, to: 12 });
  });

  it("xu hướng: 5 điểm liên tiếp giảm", () => {
    const r = analyzeRunChart([70, 90, 85, 80, 75, 70, 72, 74, 71])!;
    const trend = r.signals.find((s) => s.kind === "trend" && s.direction === "down")!;
    expect(trend).toMatchObject({ from: 1, to: 5 });
  });

  it("câu mô tả tiếng Việt", () => {
    expect(describeRunSignal({ kind: "shift", direction: "down", from: 2, to: 8 }, "tuần")).toContain("7 tuần liên tiếp dưới");
    expect(describeRunSignal({ kind: "trend", direction: "up", from: 0, to: 4 }, "tháng")).toContain("5 tháng liên tiếp tăng");
  });
});
