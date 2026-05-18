import { describe, it, expect } from "vitest";
import {
  dinhKyMatchDueOnDate,
  nextDinhKySpawnDates,
  parseIsoDateOnlyUtc,
} from "./qlcv-dinh-ky-schedule";

describe("dinhKyMatchDueOnDate (mirror RPC)", () => {
  it("WEEKLY: mốc 2026-01-01, due 2026-01-08 → khớp (7 ngày)", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-08"))).toBe(true);
  });
  it("WEEKLY: mốc 2026-01-01, due 2026-01-07 → không khớp", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-07"))).toBe(false);
  });
  it("WEEKLY: due trước mốc → false", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-06-01", parseIsoDateOnlyUtc("2026-05-30"))).toBe(false);
  });
  it("MONTHLY: cùng ngày trong tháng", () => {
    expect(dinhKyMatchDueOnDate("MONTHLY", "2026-01-15", parseIsoDateOnlyUtc("2026-03-15"))).toBe(true);
  });
  it("MONTHLY: ngày khác → false", () => {
    expect(dinhKyMatchDueOnDate("MONTHLY", "2026-01-15", parseIsoDateOnlyUtc("2026-03-14"))).toBe(false);
  });
});

describe("nextDinhKySpawnDates", () => {
  it("WEEKLY trả về các mốc 7 ngày kể từ from", () => {
    const from = parseIsoDateOnlyUtc("2026-01-01");
    const dates = nextDinhKySpawnDates("WEEKLY", "2026-01-01", from, { maxScanDays: 22, maxMatches: 4 });
    expect(dates).toEqual(["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"]);
  });
});
