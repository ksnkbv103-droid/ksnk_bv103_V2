import { describe, it, expect } from "vitest";
import {
  dinhKyMatchDueOnDate,
  nextDinhKySpawnDates,
  parseIsoDateOnlyUtc,
} from "./qlcv-dinh-ky-schedule";

// =============================================================================
// SUITE 1: dinhKyMatchDueOnDate — mirror logic RPC fn_fact_cong_viec_spawn_dinh_ky_hom_nay
// =============================================================================
describe("dinhKyMatchDueOnDate (mirror RPC)", () => {
  // ---------------------------------------------------------------------------
  // WEEKLY
  // ---------------------------------------------------------------------------
  it("WEEKLY: mốc 2026-01-01, due 2026-01-08 → khớp (7 ngày)", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-08"))).toBe(true);
  });
  it("WEEKLY: mốc 2026-01-01, due 2026-01-07 → không khớp", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-07"))).toBe(false);
  });
  it("WEEKLY: due trước mốc → false", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-06-01", parseIsoDateOnlyUtc("2026-05-30"))).toBe(false);
  });
  it("WEEKLY: mốc = due → khớp (diff=0, 0%7=0)", () => {
    expect(dinhKyMatchDueOnDate("WEEKLY", "2026-03-15", parseIsoDateOnlyUtc("2026-03-15"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // MONTHLY
  // ---------------------------------------------------------------------------
  it("MONTHLY: cùng ngày trong tháng → khớp", () => {
    expect(dinhKyMatchDueOnDate("MONTHLY", "2026-01-15", parseIsoDateOnlyUtc("2026-03-15"))).toBe(true);
  });
  it("MONTHLY: ngày khác → false", () => {
    expect(dinhKyMatchDueOnDate("MONTHLY", "2026-01-15", parseIsoDateOnlyUtc("2026-03-14"))).toBe(false);
  });
  it("MONTHLY: mốc = due (cùng ngày trong tháng) → khớp", () => {
    expect(dinhKyMatchDueOnDate("MONTHLY", "2026-05-30", parseIsoDateOnlyUtc("2026-05-30"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // DAILY — bộ test mới (chu kỳ bị khóa bởi constraint cũ)
  // ---------------------------------------------------------------------------
  it("DAILY: due = ngày mốc → khớp", () => {
    expect(dinhKyMatchDueOnDate("DAILY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-01"))).toBe(true);
  });
  it("DAILY: due = ngày mốc + 1 → khớp", () => {
    expect(dinhKyMatchDueOnDate("DAILY", "2026-01-01", parseIsoDateOnlyUtc("2026-01-02"))).toBe(true);
  });
  it("DAILY: due = ngày mốc + 365 → khớp (bất kỳ ngày sau mốc)", () => {
    expect(dinhKyMatchDueOnDate("DAILY", "2026-01-01", parseIsoDateOnlyUtc("2027-01-01"))).toBe(true);
  });
  it("DAILY: due trước mốc → false", () => {
    expect(dinhKyMatchDueOnDate("DAILY", "2026-06-01", parseIsoDateOnlyUtc("2026-05-31"))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // QUARTERLY — bộ test mới (chu kỳ bị khóa bởi constraint cũ)
  // ---------------------------------------------------------------------------
  it("QUARTERLY: mốc 2026-01-15, due 2026-04-15 → khớp (3 tháng)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-04-15"))).toBe(true);
  });
  it("QUARTERLY: mốc 2026-01-15, due 2026-07-15 → khớp (6 tháng = 2 quý)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-07-15"))).toBe(true);
  });
  it("QUARTERLY: mốc 2026-01-15, due 2026-10-15 → khớp (9 tháng = 3 quý)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-10-15"))).toBe(true);
  });
  it("QUARTERLY: mốc 2026-01-15, due 2026-02-15 → KHÔNG khớp (1 tháng, không chia hết cho 3)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-02-15"))).toBe(false);
  });
  it("QUARTERLY: mốc 2026-01-15, due 2026-04-16 → KHÔNG khớp (sai ngày trong tháng)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-04-16"))).toBe(false);
  });
  it("QUARTERLY: due = mốc → khớp (khoảng cách 0 tháng, 0%3=0)", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-01-15", parseIsoDateOnlyUtc("2026-01-15"))).toBe(true);
  });
  it("QUARTERLY: due trước mốc → false", () => {
    expect(dinhKyMatchDueOnDate("QUARTERLY", "2026-06-15", parseIsoDateOnlyUtc("2026-03-15"))).toBe(false);
  });
});

// =============================================================================
// SUITE 2: nextDinhKySpawnDates — danh sách ngày sinh phiếu tương lai
// =============================================================================
describe("nextDinhKySpawnDates", () => {
  it("WEEKLY trả về các mốc 7 ngày kể từ from", () => {
    const from = parseIsoDateOnlyUtc("2026-01-01");
    const dates = nextDinhKySpawnDates("WEEKLY", "2026-01-01", from, { maxScanDays: 22, maxMatches: 4 });
    expect(dates).toEqual(["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"]);
  });

  it("MONTHLY trả về đúng ngày trong tháng kế tiếp", () => {
    const from = parseIsoDateOnlyUtc("2026-01-15");
    const dates = nextDinhKySpawnDates("MONTHLY", "2026-01-15", from, { maxScanDays: 100, maxMatches: 3 });
    expect(dates).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("DAILY: 5 ngày liên tiếp từ mốc", () => {
    const from = parseIsoDateOnlyUtc("2026-06-01");
    const dates = nextDinhKySpawnDates("DAILY", "2026-06-01", from, { maxScanDays: 10, maxMatches: 5 });
    expect(dates).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });

  it("DAILY: from sau ngày mốc vẫn khớp liên tục", () => {
    const from = parseIsoDateOnlyUtc("2026-06-10");
    const dates = nextDinhKySpawnDates("DAILY", "2026-01-01", from, { maxScanDays: 5, maxMatches: 3 });
    expect(dates).toEqual(["2026-06-10", "2026-06-11", "2026-06-12"]);
  });

  it("QUARTERLY: 4 lần từ mốc Q1 2026", () => {
    const from = parseIsoDateOnlyUtc("2026-01-15");
    const dates = nextDinhKySpawnDates("QUARTERLY", "2026-01-15", from, { maxScanDays: 400, maxMatches: 4 });
    expect(dates).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
  });

  it("QUARTERLY: from = giữa hai kỳ → chỉ trả về kỳ tiếp theo", () => {
    const from = parseIsoDateOnlyUtc("2026-02-01"); // sau 2026-01-15, trước 2026-04-15
    const dates = nextDinhKySpawnDates("QUARTERLY", "2026-01-15", from, { maxScanDays: 200, maxMatches: 2 });
    expect(dates).toEqual(["2026-04-15", "2026-07-15"]);
  });
});
