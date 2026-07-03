import { describe, expect, it } from "vitest";
import { assertLotExportable, fefoSortLots, isLotExpired, pickFefoLotKey } from "./cssd-kho-hoa-chat-fefo";

describe("cssd-kho-hoa-chat-fefo", () => {
  it("sorts lots by nearest expiry first", () => {
    const sorted = fefoSortLots([
      { ma_lo: "B", han_su_dung: "2026-12-01", ton_so_luong: 5 },
      { ma_lo: "A", han_su_dung: "2026-06-01", ton_so_luong: 3 },
    ]);
    expect(sorted[0]?.ma_lo).toBe("A");
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

  it("blocks export of expired lot", () => {
    expect(isLotExpired("2026-01-01", "2026-06-27")).toBe(true);
    expect(assertLotExportable("2026-01-01", "2026-06-27")).toMatch(/quá hạn/);
  });
});
