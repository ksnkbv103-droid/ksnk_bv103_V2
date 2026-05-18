import { describe, expect, it } from "vitest";
import { aggregateNkbvDashboard } from "./nkbv-dashboard-aggregate";

describe("aggregateNkbvDashboard", () => {
  it("returns zero KPIs when no rows in range", () => {
    const out = aggregateNkbvDashboard([], "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(0);
    expect(out.kpis.da_xac_nhan).toBe(0);
    expect(out.kpis.ti_le_xac_nhan_so_voi_pa).toBe(0);
    expect(out.monthly.length).toBeGreaterThanOrEqual(1);
  });

  it("counts XAC_NHAN and excludes LOAI_TRU from PA denominator for rate", () => {
    const rows = [
      {
        ngay_phat_hien: "2026-01-15",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN", ten_trang_thai: "Đã xác nhận" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
      },
      {
        ngay_phat_hien: "2026-01-16",
        trang_thai_row: { ma_trang_thai: "LOAI_TRU", ten_trang_thai: "Loại trừ" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
      },
      {
        ngay_phat_hien: "2026-01-17",
        trang_thai_row: { ma_trang_thai: "CHO_XAC_NHAN", ten_trang_thai: "Chờ XN" },
        loai_nkbv: { ma_loai: "BSI", ten_loai: "BSI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa B" },
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(3);
    expect(out.kpis.da_xac_nhan).toBe(1);
    expect(out.kpis.loai_tru).toBe(1);
    expect(out.kpis.dang_va_cho_xn).toBe(1);
    // PA = 3 - 1 loại trừ = 2 → 1/2 = 50%
    expect(out.kpis.ti_le_xac_nhan_so_voi_pa).toBe(50);
  });

  it("filters by date range on ngay_phat_hien", () => {
    const rows = [
      {
        ngay_phat_hien: "2025-12-31",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "X" },
        khoa_ghi_nhan: { ten_khoa: "K1" },
      },
      {
        ngay_phat_hien: "2026-01-05",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "X" },
        khoa_ghi_nhan: { ten_khoa: "K1" },
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(1);
  });
});
