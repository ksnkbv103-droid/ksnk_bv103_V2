import { describe, expect, it } from "vitest";
import { computeVacFromDailyVent, buildEmptyVentDays, computeVaeQad, ivacAntimicrobialGate } from "./nkbv-vae-vent-compute";

describe("nkbv-vae-vent-compute", () => {
  it("buildEmptyVentDays sinh đủ ngày", () => {
    const rows = buildEmptyVentDays("2026-05-01", 4);
    expect(rows).toHaveLength(4);
    expect(rows[0].date).toBe("2026-05-01");
    expect(rows[3].date).toBe("2026-05-04");
  });

  it("phát hiện VAC khi ổn định rồi PEEP tăng ≥3 trong 2 ngày", () => {
    const res = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-03", peep_min: 8, fio2_min: 40 },
      { date: "2026-05-04", peep_min: 8, fio2_min: 40 },
    ]);
    expect(res.has_stable_baseline).toBe(true);
    expect(res.peep_increase_ge_3).toBe(true);
    expect(res.suggested_doe).toBe("2026-05-03");
  });

  it("không VAC nếu thiếu ngày hoặc không suy giảm", () => {
    expect(computeVacFromDailyVent([{ date: "2026-05-01", peep_min: 5, fio2_min: 40 }]).has_stable_baseline).toBe(
      false,
    );
    const flat = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-03", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-04", peep_min: 5, fio2_min: 40 },
    ]);
    expect(flat.peep_increase_ge_3 || flat.fio2_increase_ge_20).toBe(false);
  });

  it("P0 IVAC QAD: đếm ngày kháng sinh trong DOE±2", () => {
    expect(
      computeVaeQad({
        doe: "2026-06-10",
        antimicrobialDaily: [
          { date: "2026-06-08" },
          { date: "2026-06-09" },
          { date: "2026-06-10" },
          { date: "2026-06-11" },
          { date: "2026-06-01" }, // ngoài cửa sổ
        ],
      }),
    ).toBe(4);
    expect(
      ivacAntimicrobialGate({
        doe: "2026-06-10",
        antimicrobialDaily: [
          { date: "2026-06-08" },
          { date: "2026-06-09" },
          { date: "2026-06-10" },
        ],
        legacyTick: true,
      }),
    ).toBe(false); // chỉ 3 QAD — tick legacy bị ghi đè khi có lịch
    expect(
      ivacAntimicrobialGate({
        doe: "2026-06-10",
        qadCount: 4,
        legacyTick: false,
      }),
    ).toBe(true);
    expect(
      ivacAntimicrobialGate({
        doe: "2026-06-10",
        legacyTick: true,
      }),
    ).toBe(true); // fallback tick khi chưa có QAD
  });
});
