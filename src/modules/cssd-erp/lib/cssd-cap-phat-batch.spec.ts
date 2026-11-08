import { describe, expect, it } from "vitest";
import { normalizeCapPhatCodes, summarizeCapPhatBatch } from "./cssd-cap-phat-batch";

describe("normalizeCapPhatCodes", () => {
  it("trim, viết hoa, bỏ trống và trùng, giữ thứ tự", () => {
    expect(normalizeCapPhatCodes([" b01.set.01 ", "", "B01.SET.01", "b02.set.01"])).toEqual([
      "B01.SET.01",
      "B02.SET.01",
    ]);
  });
});

describe("summarizeCapPhatBatch", () => {
  it("đếm bộ ok / lỗi, lỗi một bộ không làm mất bộ khác", () => {
    const s = summarizeCapPhatBatch([
      { maQr: "A", ok: true, tenBo: "A", quyTrinhId: "1", daCapTruoc: false },
      { maQr: "B", ok: false, error: "chưa ở CAP_PHAT" },
      { maQr: "C", ok: true, tenBo: "C", quyTrinhId: "3", daCapTruoc: false },
    ]);
    expect(s).toEqual({ total: 3, ok: 2, failed: 1 });
  });
});
