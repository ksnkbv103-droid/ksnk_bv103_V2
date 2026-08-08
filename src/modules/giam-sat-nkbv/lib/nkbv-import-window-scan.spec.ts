import { describe, expect, it } from "vitest";
import { scanImportWindowAlerts, scanStayCrossCaseAlerts } from "./nkbv-import-window-scan";

describe("scanImportWindowAlerts", () => {
  const events = [
    {
      id: "e1",
      ma_benh_an: "BA-1",
      ngay_phat_hien: "2026-05-20",
      vi_tri_nhiem_khuan: "Đường tiết niệu",
      loai_ma: "UTI",
    },
  ];

  it("cảnh báo RIT khi mẫu cùng major type trong 14 ngày từ DOE", () => {
    const alerts = scanImportWindowAlerts({
      ma_benh_an: "BA-1",
      ngay_lay_mau: "2026-05-25",
      loai_benh_pham: "Nước tiểu",
      existingEvents: events,
    });
    expect(alerts.some((a) => a.code === "RIT")).toBe(true);
  });

  it("không RIT khi khác major type (máu vs UTI) — chỉ SBAP", () => {
    const alerts = scanImportWindowAlerts({
      ma_benh_an: "BA-1",
      ngay_lay_mau: "2026-05-22",
      loai_benh_pham: "Máu",
      existingEvents: events,
    });
    expect(alerts.some((a) => a.code === "SBAP")).toBe(true);
    expect(alerts.some((a) => a.code === "RIT")).toBe(false);
  });

  it("không SBAP nếu không phải máu", () => {
    const alerts = scanImportWindowAlerts({
      ma_benh_an: "BA-1",
      ngay_lay_mau: "2026-05-22",
      loai_benh_pham: "Đờm",
      existingEvents: events,
    });
    expect(alerts.some((a) => a.code === "SBAP")).toBe(false);
  });
});

describe("scanStayCrossCaseAlerts", () => {
  it("SBAP giữa UTI và BSI; không RIT khác major type", () => {
    const alerts = scanStayCrossCaseAlerts([
      {
        id: "uti-1",
        ma_benh_an: "BA-2",
        ngay_phat_hien: "2026-05-20",
        vi_tri_nhiem_khuan: "Đường tiết niệu",
        loai_ma: "UTI",
      },
      {
        id: "bsi-1",
        ma_benh_an: "BA-2",
        ngay_phat_hien: "2026-05-22",
        vi_tri_nhiem_khuan: "Máu",
        loai_ma: "BSI",
      },
    ]);
    expect(alerts.some((a) => a.code === "SBAP")).toBe(true);
    expect(alerts.some((a) => a.code === "RIT")).toBe(false);
  });
});
