import { describe, it, expect } from "vitest";
import {
  resolveQlcvPeriodRange,
  resolveQlcvPeriodRangeShifted,
  startOfIsoWeekUtc,
  formatIsoDateOnlyUtc,
} from "./qlcv-period-range";

describe("resolveQlcvPeriodRange", () => {
  it("WEEK: 2026-07-29 (Wed) → Mon 27 → Sun 02/08", () => {
    const r = resolveQlcvPeriodRange("WEEK", new Date(Date.UTC(2026, 6, 29)));
    expect(r.startIso).toBe("2026-07-27");
    expect(r.endIso).toBe("2026-08-02");
  });

  it("MONTH: July 2026", () => {
    const r = resolveQlcvPeriodRange("MONTH", new Date(Date.UTC(2026, 6, 15)));
    expect(r.startIso).toBe("2026-07-01");
    expect(r.endIso).toBe("2026-07-31");
    expect(r.label).toContain("07/2026");
  });

  it("QUARTER: Q3 2026", () => {
    const r = resolveQlcvPeriodRange("QUARTER", new Date(Date.UTC(2026, 6, 15)));
    expect(r.startIso).toBe("2026-07-01");
    expect(r.endIso).toBe("2026-09-30");
    expect(r.label).toBe("Quý 3/2026");
  });

  it("YEAR: 2026", () => {
    const r = resolveQlcvPeriodRange("YEAR", new Date(Date.UTC(2026, 6, 15)));
    expect(r.startIso).toBe("2026-01-01");
    expect(r.endIso).toBe("2026-12-31");
  });
});

describe("startOfIsoWeekUtc", () => {
  it("Sunday → previous Monday", () => {
    const mon = startOfIsoWeekUtc(new Date(Date.UTC(2026, 7, 2))); // Sun Aug 2
    expect(formatIsoDateOnlyUtc(mon)).toBe("2026-07-27");
  });
});

describe("resolveQlcvPeriodRangeShifted", () => {
  it("WEEK +1 từ 2026-07-29", () => {
    const r = resolveQlcvPeriodRangeShifted("WEEK", 1, new Date(Date.UTC(2026, 6, 29)));
    expect(r.startIso).toBe("2026-08-03");
    expect(r.endIso).toBe("2026-08-09");
  });
});
