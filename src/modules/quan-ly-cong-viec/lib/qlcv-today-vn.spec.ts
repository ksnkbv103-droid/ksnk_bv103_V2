import { afterEach, describe, expect, it, vi } from "vitest";
import { isQlcvHanPastVn, qlcvDateVnFromInstant, qlcvTodayVn } from "./qlcv-today-vn";

describe("qlcvTodayVn / ranh giới 23:59–00:05 VN", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("17:30 UTC = 00:30 ngày D+1 VN → hôm nay = D+1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T17:30:00Z"));
    expect(qlcvTodayVn()).toBe("2026-10-06");
  });

  it("16:59 UTC = 23:59 ngày D VN → hôm nay vẫn D", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T16:59:00Z"));
    expect(qlcvTodayVn()).toBe("2026-10-05");
  });

  it("17:05 UTC = 00:05 ngày D+1 VN → hôm nay = D+1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T17:05:00Z"));
    expect(qlcvTodayVn()).toBe("2026-10-06");
  });

  it("hạn D quá hạn lúc 00:30 VN ngày D+1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T17:30:00Z"));
    expect(isQlcvHanPastVn("2026-10-05")).toBe(true);
    expect(isQlcvHanPastVn("2026-10-06")).toBe(false);
  });

  it("timestamptz → ngày VN (hoàn thành 20:00Z = 03:00 VN ngày sau)", () => {
    expect(qlcvDateVnFromInstant("2026-09-18T20:00:00Z")).toBe("2026-09-19");
  });

  it("date-only không lệch TZ", () => {
    expect(qlcvDateVnFromInstant("2026-09-18")).toBe("2026-09-18");
  });
});
