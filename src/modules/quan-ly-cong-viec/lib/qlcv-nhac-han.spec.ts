import { describe, expect, it } from "vitest";
import { countQlcvNhacHan, isNhacHanCountReliable } from "./qlcv-nhac-han";

const ME = "me-1";
const NOW = new Date("2026-10-28T03:00:00Z"); // 10:00 giờ VN
const base = { nguoi_phu_trach_id: ME, trang_thai: "DANG_LAM" };

describe("countQlcvNhacHan", () => {
  it("0/0 khi không có việc hoặc không có actor", () => {
    expect(countQlcvNhacHan([], ME, NOW)).toEqual({ quaHan: 0, homNay: 0 });
    expect(countQlcvNhacHan([{ ...base, is_qua_han: true }], null, NOW)).toEqual({ quaHan: 0, homNay: 0 });
  });
  it("chỉ quá hạn", () => {
    expect(countQlcvNhacHan([{ ...base, is_qua_han: true, han_hoan_thanh: "2026-10-20" }], ME, NOW)).toEqual({
      quaHan: 1,
      homNay: 0,
    });
  });
  it("chỉ hôm nay", () => {
    expect(countQlcvNhacHan([{ ...base, han_hoan_thanh: "2026-10-28" }], ME, NOW)).toEqual({ quaHan: 0, homNay: 1 });
  });
  it("bỏ việc của người khác", () => {
    const t = { ...base, nguoi_phu_trach_id: "other", is_qua_han: true, han_hoan_thanh: "2026-10-28" };
    expect(countQlcvNhacHan([t], ME, NOW)).toEqual({ quaHan: 0, homNay: 0 });
  });
  it("bỏ việc đã đóng", () => {
    const t = { ...base, trang_thai: "HOAN_THANH", is_qua_han: true, han_hoan_thanh: "2026-10-28" };
    const h = { ...base, trang_thai: "DA_HUY", is_qua_han: true };
    expect(countQlcvNhacHan([t, h], ME, NOW)).toEqual({ quaHan: 0, homNay: 0 });
  });
});

describe("isNhacHanCountReliable", () => {
  it("false với lens cắt dữ liệu", () => {
    expect(isNhacHanCountReliable("OVERDUE")).toBe(false);
    expect(isNhacHanCountReliable("IN_PROGRESS")).toBe(false);
    expect(isNhacHanCountReliable("MY_TASKS")).toBe(true);
    expect(isNhacHanCountReliable(null)).toBe(true);
  });
});
