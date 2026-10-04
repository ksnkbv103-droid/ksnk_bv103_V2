import { describe, expect, it } from "vitest";
import { computeVacFromDailyVent, buildEmptyVentDays } from "./nkbv-vae-vent-compute";

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

  it("20f: ECMO giữa stretch → ngày đó out; VAC trên 4 ngày lịch liền kề còn lại", () => {
    // D1-D2 stable, D3 ECMO (out), D4-D5 would not be adjacent after drop → no VAC on first window.
    // Second eligible stretch: D4-D5 stable, D6-D7 worsen.
    const res = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-03", peep_min: 10, fio2_min: 60, on_ecmo: true },
      { date: "2026-05-04", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-05", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-06", peep_min: 8, fio2_min: 40 },
      { date: "2026-05-07", peep_min: 8, fio2_min: 40 },
    ]);
    expect(res.excluded_dates).toEqual(["2026-05-03"]);
    expect(res.has_stable_baseline).toBe(true);
    expect(res.peep_increase_ge_3).toBe(true);
    expect(res.suggested_doe).toBe("2026-05-06");
  });

  it("20f: ECMO mid-stretch breaks adjacency — no VAC across gap", () => {
    // Only 4 eligible days with gap: D1 D2 |ECMO| D4 D5 — not calendar-adjacent across gap
    const res = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-03", peep_min: 8, fio2_min: 40, on_ecmo: true },
      { date: "2026-05-04", peep_min: 8, fio2_min: 40 },
      { date: "2026-05-05", peep_min: 8, fio2_min: 40 },
    ]);
    expect(res.excluded_dates).toEqual(["2026-05-03"]);
    expect(res.has_stable_baseline).toBe(false);
    expect(res.peep_increase_ge_3 || res.fio2_increase_ge_20).toBe(false);
  });

  it("20f: HFV full-day excluded like ECMO", () => {
    const res = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-03", peep_min: 5, fio2_min: 40, on_hfv: true },
      { date: "2026-05-04", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-05", peep_min: 5, fio2_min: 40 },
      { date: "2026-05-06", peep_min: 8, fio2_min: 40 },
      { date: "2026-05-07", peep_min: 8, fio2_min: 40 },
    ]);
    expect(res.excluded_dates).toEqual(["2026-05-03"]);
    expect(res.suggested_doe).toBe("2026-05-06");
  });

  it("20f: APRV FiO₂↑≥20 → VAC; PEEP↑ alone không đủ", () => {
    const peepOnly = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40, on_aprv: true },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40, on_aprv: true },
      { date: "2026-05-03", peep_min: 10, fio2_min: 40, on_aprv: true },
      { date: "2026-05-04", peep_min: 10, fio2_min: 40, on_aprv: true },
    ]);
    expect(peepOnly.peep_increase_ge_3).toBe(false);
    expect(peepOnly.fio2_increase_ge_20).toBe(false);
    expect(peepOnly.has_stable_baseline).toBe(false);

    const fioOk = computeVacFromDailyVent([
      { date: "2026-05-01", peep_min: 5, fio2_min: 40, on_aprv: true },
      { date: "2026-05-02", peep_min: 5, fio2_min: 40, on_aprv: true },
      { date: "2026-05-03", peep_min: 5, fio2_min: 65, on_aprv: true },
      { date: "2026-05-04", peep_min: 5, fio2_min: 65, on_aprv: true },
    ]);
    expect(fioOk.has_stable_baseline).toBe(true);
    expect(fioOk.fio2_increase_ge_20).toBe(true);
    expect(fioOk.peep_increase_ge_3).toBe(false);
    expect(fioOk.suggested_doe).toBe("2026-05-03");
    expect(fioOk.reason).toMatch(/APRV: FiO₂-only/);
  });

  it("20f: episode on_aprv_or_hfv legacy → APRV FiO₂-only (not HFV exclude)", () => {
    const res = computeVacFromDailyVent(
      [
        { date: "2026-05-01", peep_min: 5, fio2_min: 40 },
        { date: "2026-05-02", peep_min: 5, fio2_min: 40 },
        { date: "2026-05-03", peep_min: 10, fio2_min: 65 },
        { date: "2026-05-04", peep_min: 10, fio2_min: 65 },
      ],
      { on_aprv_or_hfv: true },
    );
    expect(res.excluded_dates ?? []).toHaveLength(0);
    expect(res.fio2_increase_ge_20).toBe(true);
    expect(res.peep_increase_ge_3).toBe(false);
  });
});
