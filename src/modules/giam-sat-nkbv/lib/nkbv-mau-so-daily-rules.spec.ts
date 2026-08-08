import { describe, expect, it } from "vitest";
import {
  listCalendarDaysInMonth,
  missingMauSoDays,
  softWarnMauSoDailyCensus,
} from "./nkbv-mau-so-daily-rules";

describe("nkbv-mau-so-daily-rules", () => {
  it("lists all days in month", () => {
    expect(listCalendarDaysInMonth(2026, 2)).toHaveLength(28);
    expect(listCalendarDaysInMonth(2026, 8)[0]).toBe("2026-08-01");
  });

  it("finds missing submitted days excluding future", () => {
    const missing = missingMauSoDays(
      2026,
      8,
      ["2026-08-01", "2026-08-03"],
      "2026-08-05",
    );
    expect(missing).toEqual(["2026-08-02", "2026-08-04", "2026-08-05"]);
  });

  it("soft-warns when over bed capacity", () => {
    const w = softWarnMauSoDailyCensus(
      {
        so_ngay_dieu_tri: 40,
        so_ngay_catheter_cvc: 5,
        so_ngay_sonde_tieu: 5,
        so_ngay_tho_may: 2,
      },
      20,
    );
    expect(w.some((x) => x.code === "OVER_BEDS")).toBe(true);
  });

  it("soft-warns device > patient", () => {
    const w = softWarnMauSoDailyCensus({
      so_ngay_dieu_tri: 10,
      so_ngay_catheter_cvc: 12,
      so_ngay_sonde_tieu: 0,
      so_ngay_tho_may: 0,
    });
    expect(w.some((x) => x.code === "DEVICE_GT_PATIENT")).toBe(true);
  });

  it("does not warn on normal ICU day", () => {
    const w = softWarnMauSoDailyCensus(
      {
        so_ngay_dieu_tri: 18,
        so_ngay_catheter_cvc: 12,
        so_ngay_sonde_tieu: 10,
        so_ngay_tho_may: 8,
      },
      20,
    );
    expect(w).toHaveLength(0);
  });
});
