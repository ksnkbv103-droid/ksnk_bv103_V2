import { describe, expect, it } from "vitest";
import {
  addDaysYmd,
  assertLotExportable,
  fefoSortLots,
  isLotExpired,
  isLotNearExpiry,
  NEAR_EXPIRY_DAYS,
  pickFefoLotKey,
} from "./cssd-kho-hoa-chat-fefo";
import { todayYmdInVn } from "@/lib/format-datetime-vi";

describe("cssd-kho-hoa-chat-fefo", () => {
  it("sorts lots by nearest expiry first", () => {
    const sorted = fefoSortLots([
      { ma_lo: "B", han_su_dung: "2026-12-01", ton_so_luong: 5 },
      { ma_lo: "A", han_su_dung: "2026-06-01", ton_so_luong: 3 },
      { ma_lo: "Z", han_su_dung: null, ton_so_luong: 1 },
    ]);
    expect(sorted.map((x) => x.ma_lo)).toEqual(["A", "B", "Z"]);
  });

  it("picks FEFO lot key skipping expired", () => {
    const key = pickFefoLotKey(
      [
        { ma_lo: "OLD", han_su_dung: "2025-01-01", ton_so_luong: 10 },
        { ma_lo: "NEW", han_su_dung: "2026-08-01", ton_so_luong: 2 },
      ],
      "2026-06-27",
    );
    expect(key).toBe("NEW|2026-08-01");
  });


  it("defaults today to VN calendar for expiry when todayYmd omitted", () => {
    const edge = new Date("2026-09-03T17:30:00.000Z");
    expect(todayYmdInVn(edge)).toBe("2026-09-04");
    // Explicit VN today still drives FEFO — callers should pass todayYmdInVn()
    expect(isLotExpired("2026-09-03", todayYmdInVn(edge))).toBe(true);
    expect(isLotExpired("2026-09-04", todayYmdInVn(edge))).toBe(false);
  });

  it("blocks export of expired lot", () => {
    expect(isLotExpired("2026-01-01", "2026-06-27")).toBe(true);
    expect(assertLotExportable("2026-01-01", "2026-06-27")).toMatch(/quá hạn/);
  });

  it("flags near-expiry within default horizon and already expired", () => {
    expect(NEAR_EXPIRY_DAYS).toBe(30);
    expect(isLotNearExpiry("2026-07-10", "2026-06-27")).toBe(true); // 13 ngày
    expect(isLotNearExpiry("2026-08-01", "2026-06-27")).toBe(false); // >30 ngày
    expect(isLotNearExpiry("2026-06-01", "2026-06-27")).toBe(true); // đã quá hạn
    expect(isLotNearExpiry(null, "2026-06-27")).toBe(false);
    expect(isLotNearExpiry("2026-07-27", "2026-06-27", 30)).toBe(true); // đúng biên 30 ngày
  });

  it("addDaysYmd is timezone-safe via UTC noon", () => {
    expect(addDaysYmd("2026-06-27", 30)).toBe("2026-07-27");
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("pickFefoLotKey skips expired even when sorted first", () => {
    const key = pickFefoLotKey(
      [
        { ma_lo: "OLD", han_su_dung: "2026-01-01", ton_so_luong: 10 },
        { ma_lo: "MID", han_su_dung: "2026-07-01", ton_so_luong: 0 },
        { ma_lo: "OK", han_su_dung: "2026-08-01", ton_so_luong: 2 },
      ],
      "2026-06-27",
    );
    expect(key).toBe("OK|2026-08-01");
  });
});
