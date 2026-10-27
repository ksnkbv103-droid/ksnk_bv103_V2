import { describe, expect, it } from "vitest";
import {
  formatDateTimeVi,
  formatDateVi,
  formatTimeVi,
  formatTimeHmVi,
  parseDateTimeInput,
  todayYmdInVn,
  vnYmd,
} from "./format-datetime-vi";

describe("format-datetime-vi", () => {
  it("parse YYYY-MM-DD không lệch ngày", () => {
    const d = parseDateTimeInput("2026-08-05");
    expect(d).not.toBeNull();
    expect(formatDateVi("2026-08-05")).toBe("05/08/2026");
  });

  it("chỉ ngày → dd/mm/yyyy", () => {
    expect(formatDateVi("2026-01-09")).toBe("09/01/2026");
    expect(formatDateVi(null)).toBe("—");
    expect(formatDateVi("", "---")).toBe("---");
  });

  it("chỉ giờ → hh:mm:ss (Asia/Ho_Chi_Minh)", () => {
    // 2026-08-05T07:30:45+07:00
    expect(formatTimeVi("2026-08-05T00:30:45.000Z")).toBe("07:30:45");
  });

  it("ngày+giờ → hh:mm:ss, dd/mm/yyyy", () => {
    expect(formatDateTimeVi("2026-08-05T00:30:45.000Z")).toBe("07:30:45, 05/08/2026");
  });

  it("Date object hợp lệ", () => {
    const d = new Date("2026-12-31T17:00:00.000Z"); // 00:00:00 01/01/2027 VN
    expect(formatDateTimeVi(d)).toBe("00:00:00, 01/01/2027");
  });

  it("todayYmdInVn follows Asia/Ho_Chi_Minh calendar", () => {
    expect(todayYmdInVn(new Date("2026-09-03T17:00:00.000Z"))).toBe("2026-09-04");
    expect(todayYmdInVn(new Date("2026-09-03T16:59:00.000Z"))).toBe("2026-09-03");
  });
});

describe("formatTimeHmVi (CSSD-L02 scan short)", () => {
  it("returns HH:mm without seconds", () => {
    expect(formatTimeHmVi("2026-08-05T00:30:45.000Z")).toBe("07:30");
  });
});

describe("vnYmd — ngày lịch Việt Nam (lát NK-TZ)", () => {
  it("17:00Z = 00:00 VN hôm sau → ngày kế tiếp", () => {
    expect(vnYmd("2026-08-09T17:00:00Z")).toBe("2026-08-10");
    expect(vnYmd("2026-08-09T17:00:00+00:00")).toBe("2026-08-10");
    expect(vnYmd("2026-08-09 17:00:00+00")).toBe("2026-08-10");
  });

  it("16:59Z = 23:59 VN → cùng ngày", () => {
    expect(vnYmd("2026-08-09T16:59:59.999Z")).toBe("2026-08-09");
  });

  it("định dạng import +07:00 đọc đúng ngày VN", () => {
    expect(vnYmd("2026-08-10T00:00:00+07:00")).toBe("2026-08-10");
  });

  it("chuỗi chỉ-ngày và giờ không múi giữ nguyên phần ngày", () => {
    expect(vnYmd("2026-08-10")).toBe("2026-08-10");
    expect(vnYmd(" 2026-08-10 ")).toBe("2026-08-10");
    expect(vnYmd("2026-08-10T23:30")).toBe("2026-08-10");
  });

  it("Date / số ms → ngày VN", () => {
    expect(vnYmd(new Date("2026-08-09T17:00:00Z"))).toBe("2026-08-10");
    expect(vnYmd(Date.parse("2026-08-09T16:00:00Z"))).toBe("2026-08-09");
  });

  it("null / rỗng / không hợp lệ → chuỗi rỗng", () => {
    expect(vnYmd(null)).toBe("");
    expect(vnYmd(undefined)).toBe("");
    expect(vnYmd("")).toBe("");
    expect(vnYmd("không phải ngày")).toBe("");
    expect(vnYmd(new Date("x"))).toBe("");
  });
});
