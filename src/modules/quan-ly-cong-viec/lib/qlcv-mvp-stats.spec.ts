import { describe, expect, it } from "vitest";
import { computeQlcvMvpStats } from "./qlcv-mvp-stats";

describe("computeQlcvMvpStats (19b)", () => {
  it("10 phiếu: 4 mở (1 QH), 5 HT, 1 hủy → Số việc 4; %QH 25; %HT 5/9", () => {
    const rows = [
      { trang_thai: "DANG_LAM", is_active: true },
      { trang_thai: "DANG_LAM", is_active: true },
      { trang_thai: "DANG_LAM", is_active: true },
      { trang_thai: "DANG_LAM", is_active: true, is_qua_han: true },
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "DA_HUY", is_active: true },
    ];
    const out = computeQlcvMvpStats(rows);
    expect(out.tong).toBe(4);
    expect(out.quaHan).toBe(1);
    expect(out.pctQuaHan).toBe(25);
    expect(out.pctHoanThanh).toBeCloseTo(55.6, 0);
  });

  it("rỗng → % null", () => {
    expect(computeQlcvMvpStats([])).toEqual({
      tong: 0,
      mo: 0,
      hoanThanh: 0,
      quaHan: 0,
      pctHoanThanh: null,
      pctQuaHan: null,
    });
  });

  it("TU_CHOI tính là mở", () => {
    const out = computeQlcvMvpStats([
      { trang_thai: "TU_CHOI", is_active: true, is_qua_han: true },
      { trang_thai: "HOAN_THANH", is_active: true },
    ]);
    expect(out.tong).toBe(1);
    expect(out.pctQuaHan).toBe(100);
  });
});
