import { describe, expect, it } from "vitest";
import {
  countDeviceDaysInRange,
  deviceCountStartDate,
  previewMauSoFromRegistry,
} from "./nkbv-shared-device-days";

describe("nkbv-shared-device-days", () => {
  it("CL counts from first_access when set", () => {
    expect(
      deviceCountStartDate({
        device_type: "CENTRAL_LINE",
        insertion_date: "2026-08-01",
        first_access_date: "2026-08-03",
      }),
    ).toBe("2026-08-03");
  });

  it("counts Foley days inclusive in range", () => {
    const n = countDeviceDaysInRange(
      {
        device_type: "FOLEY",
        insertion_date: "2026-08-01",
        removal_date: "2026-08-05",
      },
      "2026-08-01",
      "2026-08-31",
    );
    expect(n).toBe(5);
  });

  it("preview aggregates by device type", () => {
    const p = previewMauSoFromRegistry(
      [
        {
          device_type: "CENTRAL_LINE",
          insertion_date: "2026-08-01",
          first_access_date: "2026-08-01",
          removal_date: "2026-08-03",
          khoa_id: "K1",
        },
        {
          device_type: "FOLEY",
          insertion_date: "2026-08-01",
          removal_date: "2026-08-02",
          khoa_id: "K1",
        },
        {
          device_type: "VENTILATOR",
          insertion_date: "2026-08-01",
          khoa_id: "K1",
        },
      ],
      "2026-08-01",
      "2026-08-03",
      "K1",
    );
    expect(p.so_ngay_catheter_cvc).toBe(3);
    expect(p.so_ngay_sonde_tieu).toBe(2);
    expect(p.so_ngay_tho_may).toBe(3);
  });
});
