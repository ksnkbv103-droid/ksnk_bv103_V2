import { describe, expect, it } from "vitest";
import {
  countDungCuCalendarDays,
  criteriaKeyToDungCuLoai,
  deviceDaysToByDate,
  dungCuDatRutIslands,
  khoaIdOnOrBefore,
  locationDaysToTreatmentHistory,
  nkbvVnDateStartIso,
  stripCopiedStayFieldsFromVerification,
} from "./nkbv-ba-ngay";

describe("nkbv-ba-ngay", () => {
  it("đếm ngày thở máy trên lưới, không đếm Foley", () => {
    const rows = [
      { ngay_lich: "2026-08-10", loai_dung_cu: "VENT" as const },
      { ngay_lich: "2026-08-11", loai_dung_cu: "VENT" as const },
      { ngay_lich: "2026-08-11", loai_dung_cu: "VENT" as const },
      { ngay_lich: "2026-08-12", loai_dung_cu: "FOLEY" as const },
      { ngay_lich: "2026-08-20", loai_dung_cu: "VENT" as const },
    ];
    expect(countDungCuCalendarDays(rows, "VENT", "2026-08-10", "2026-08-16")).toBe(2);
  });

  it("map criteria ↔ loại dụng cụ", () => {
    expect(criteriaKeyToDungCuLoai("device_foley")).toBe("FOLEY");
    expect(criteriaKeyToDungCuLoai("fever")).toBeNull();
  });

  it("tích ngày → ô lưới; bỏ ngày giữa tách 2 đoạn đặt–rút", () => {
    const by = deviceDaysToByDate([
      { ngay_lich: "2026-08-01", loai_dung_cu: "FOLEY" },
      { ngay_lich: "2026-08-02", loai_dung_cu: "FOLEY" },
      { ngay_lich: "2026-08-04", loai_dung_cu: "FOLEY" },
    ]);
    expect(by.foley["2026-08-01"]).toHaveLength(1);
    expect(by.foley["2026-08-03"]).toBeUndefined();
    expect(dungCuDatRutIslands(["2026-08-01", "2026-08-02", "2026-08-04"])).toEqual([
      { ngay_dat: "2026-08-01", ngay_rut: "2026-08-02" },
      { ngay_dat: "2026-08-04", ngay_rut: "2026-08-04" },
    ]);
  });

  it("khoa ngày sự kiện; trống thì lấy ngày trước", () => {
    const map = { "2026-08-01": "k1", "2026-08-03": "k2" };
    expect(khoaIdOnOrBefore(map, "2026-08-03")).toBe("k2");
    expect(khoaIdOnOrBefore(map, "2026-08-02")).toBe("k1");
    expect(khoaIdOnOrBefore(map, "2026-07-30")).toBeNull();
  });

  it("chuỗi khoa liền → lịch chuyển khoa", () => {
    const stays = locationDaysToTreatmentHistory(
      [
        { ngay_lich: "2026-08-01", khoa_id: "a" },
        { ngay_lich: "2026-08-02", khoa_id: "a" },
        { ngay_lich: "2026-08-03", khoa_id: "b" },
      ],
      (id) => ({ ma_khoa: id === "a" ? "K01" : "K02", ten_khoa: id }),
    );
    expect(stays).toHaveLength(2);
    expect(stays[0]).toMatchObject({ khoa_id: "a", ngay_vao: "2026-08-01", ngay_ra: "2026-08-02" });
    expect(stays[1]).toMatchObject({ khoa_id: "b", ngay_vao: "2026-08-03", ngay_ra: "2026-08-03" });
  });

  it("phiếu không giữ bản copy khoa/dụng cụ", () => {
    const stripped = stripCopiedStayFieldsFromVerification({
      doe_date: "2026-08-05",
      treatment_history: [{ khoa_id: "x" }],
      device_placed_date: "2026-08-01",
      loai: "keep",
    });
    expect(stripped.treatment_history).toBeUndefined();
    expect(stripped.device_placed_date).toBeUndefined();
    expect(stripped.doe_date).toBe("2026-08-05");
  });

  it("ngày lịch VN không lệch UTC", () => {
    expect(nkbvVnDateStartIso("2026-08-01")).toBe("2026-08-01T00:00:00+07:00");
  });
});
