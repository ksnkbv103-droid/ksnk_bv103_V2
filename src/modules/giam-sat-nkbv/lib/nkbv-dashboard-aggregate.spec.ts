import { describe, expect, it } from "vitest";
import {
  aggregateNkbvDashboard,
  formatNkbvXacNhanVolume,
  mapNkbvDashboardCasFromViewRow,
  matchNkbvDashboardLoaKhoa,
  nkbvDashboardFetchBounds,
  nkbvPaMauSo,
  nkbvReportDate,
} from "./nkbv-dashboard-aggregate";

describe("aggregateNkbvDashboard", () => {
  it("returns zero KPIs when no rows in range", () => {
    const out = aggregateNkbvDashboard([], "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(0);
    expect(out.kpis.da_xac_nhan).toBe(0);
    expect(out.kpis.ti_le_xac_nhan_so_voi_pa).toBeNull();
    expect(out.monthly.length).toBeGreaterThanOrEqual(1);
  });

  it("counts XAC_NHAN ∧ is_positive; excludes LOAI_TRU from PA denominator", () => {
    const rows = [
      {
        ngay_phat_hien: "2026-01-15",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN", ten_trang_thai: "Đã xác nhận" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
        is_positive: true,
        classification: "CAUTI_SUTI",
      },
      {
        ngay_phat_hien: "2026-01-16",
        trang_thai_row: { ma_trang_thai: "LOAI_TRU", ten_trang_thai: "Loại trừ" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
        is_positive: false,
        classification: "POA",
      },
      {
        ngay_phat_hien: "2026-01-17",
        trang_thai_row: { ma_trang_thai: "CHO_XAC_NHAN", ten_trang_thai: "Chờ XN" },
        loai_nkbv: { ma_loai: "BSI", ten_loai: "BSI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa B" },
      },
      {
        // XAC_NHAN nhưng không dương tính → không đếm KPI NKBV
        ngay_phat_hien: "2026-01-18",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN", ten_trang_thai: "Đã xác nhận" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
        is_positive: false,
        classification: "POA",
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(4);
    expect(out.kpis.da_xac_nhan).toBe(1);
    expect(out.kpis.loai_tru).toBe(1);
    expect(out.kpis.dang_va_cho_xn).toBe(1);
    // Mẫu = 2 XAC_NHAN + 1 LOAI_TRU = 3 → 1/3 ≈ 33.3%
    expect(out.kpis.phieu_xac_nhan_trang_thai).toBe(2);
    expect(out.kpis.ti_le_xac_nhan_so_voi_pa).toBe(33.3);
    expect(out.by_loai).toEqual(
      expect.arrayContaining([expect.objectContaining({ ma: "UTI", so_phieu: 1 })]),
    );
  });

  it("kỳ báo cáo theo report_date/DOE (không Index)", () => {
    const out = aggregateNkbvDashboard(
      [
        {
          ngay_phat_hien: "2026-11-02",
          report_date: "2026-10-30",
          trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
          loai_nkbv: { ma_loai: "UTI" },
          khoa_ghi_nhan: { ten_khoa: "A" },
          is_positive: true,
          classification: "CAUTI_SUTI",
        },
      ],
      "2026-10-01",
      "2026-10-31",
    );
    expect(out.kpis.tong_phieu).toBe(1);
    expect(nkbvReportDate({ ngay_phat_hien: "2026-11-02", report_date: "2026-10-30" })).toBe(
      "2026-10-30",
    );
  });

  it("by_loai maps PNU2_VAP → VAP (not HAP portal)", () => {
    const out = aggregateNkbvDashboard(
      [
        {
          ngay_phat_hien: "2026-01-15",
          trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
          loai_nkbv: { ma_loai: "HAP", ten_loai: "HAP" },
          khoa_ghi_nhan: { ten_khoa: "ICU" },
          is_positive: true,
          classification: "PNU2_VAP",
        },
      ],
      "2026-01-01",
      "2026-01-31",
    );
    expect(out.by_loai[0]?.ma).toBe("VAP");
  });

  it("counts CHO_DUYET in dang_va_cho_xn (phiếu đã gửi form, chưa duyệt)", () => {
    const rows = [
      {
        ngay_phat_hien: "2026-01-18",
        trang_thai_row: { ma_trang_thai: "CHO_DUYET", ten_trang_thai: "Chờ duyệt" },
        loai_nkbv: { ma_loai: "UTI", ten_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "Khoa A" },
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(1);
    expect(out.kpis.dang_va_cho_xn).toBe(1);
    expect(out.kpis.da_xac_nhan).toBe(0);
    expect(out.kpis.loai_tru).toBe(0);
  });

  it("filters by date range on ngay_phat_hien", () => {
    const rows = [
      {
        ngay_phat_hien: "2025-12-31",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "X" },
        khoa_ghi_nhan: { ten_khoa: "K1" },
        is_positive: true,
      },
      {
        ngay_phat_hien: "2026-01-05",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "X" },
        khoa_ghi_nhan: { ten_khoa: "K1" },
        is_positive: true,
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.kpis.tong_phieu).toBe(1);
  });

  it("formatNkbvXacNhanVolume uses đã kết luận (XAC_NHAN + LOAI_TRU), not tong phiếu", () => {
    const rows = [
      {
        ngay_phat_hien: "2026-01-15",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "A" },
        is_positive: true,
        classification: "CAUTI_SUTI",
      },
      {
        ngay_phat_hien: "2026-01-16",
        trang_thai_row: { ma_trang_thai: "LOAI_TRU" },
        loai_nkbv: { ma_loai: "UTI" },
        khoa_ghi_nhan: { ten_khoa: "A" },
      },
      {
        ngay_phat_hien: "2026-01-17",
        trang_thai_row: { ma_trang_thai: "CHO_DUYET" },
        loai_nkbv: { ma_loai: "BSI" },
        khoa_ghi_nhan: { ten_khoa: "B" },
      },
    ];
    const k = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31").kpis;
    expect(k.tong_phieu).toBe(3);
    expect(nkbvPaMauSo(k)).toBe(2);
    expect(formatNkbvXacNhanVolume(k)).toBe("1/2 đã kết luận");
    expect(k.ti_le_xac_nhan_so_voi_pa).toBe(50);
  });

  it("top_khoa prefers ma compact", () => {
    const rows = [
      {
        ngay_phat_hien: "2026-01-10",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "UTI" },
        khoa_ghi_nhan: { ma_khoa: "A05", ten_khoa: "Khoa truyền nhiễm" },
        is_positive: true,
      },
      {
        ngay_phat_hien: "2026-01-11",
        trang_thai_row: { ma_trang_thai: "XAC_NHAN" },
        loai_nkbv: { ma_loai: "UTI" },
        khoa_ghi_nhan: { ma_khoa: "A05", ten_khoa: "Khoa truyền nhiễm" },
        is_positive: true,
      },
    ];
    const out = aggregateNkbvDashboard(rows, "2026-01-01", "2026-01-31");
    expect(out.top_khoa[0]?.ten_khoa).toBe("A05");
    expect(out.top_khoa[0]?.so_phieu).toBe(2);
  });
});

describe("nkbvDashboard fetch/LOA helpers", () => {
  it("pad Index ±90d quanh kỳ báo cáo", () => {
    expect(nkbvDashboardFetchBounds("2026-10-01", "2026-10-31")).toEqual({
      fetchTu: "2026-07-03",
      fetchDen: "2027-01-29",
    });
  });

  it("map: Index ngoài kỳ nhưng DOE trong kỳ → report_date = DOE", () => {
    const row = mapNkbvDashboardCasFromViewRow({
      ngay_phat_hien: "2026-11-02",
      khoa_ghi_nhan_id: "khoa-ghi",
      loai_ma: "UTI",
      loai_ten: "UTI",
      trang_thai_ma: "XAC_NHAN",
      trang_thai_ten: "Xác nhận",
      khoa_ma: "A",
      khoa_ten: "Khoa A",
      verification_data: {
        calculated_doe: "2026-10-30",
        attributed_khoa_id: "khoa-loa",
        is_positive: true,
        classification: "CAUTI_SUTI",
      },
    });
    expect(row.report_date).toBe("2026-10-30");
    expect(row.loa_khoa_id).toBe("khoa-loa");
    const inOct = aggregateNkbvDashboard([row], "2026-10-01", "2026-10-31");
    expect(inOct.kpis.tong_phieu).toBe(1);
    const inNov = aggregateNkbvDashboard([row], "2026-11-01", "2026-11-30");
    expect(inNov.kpis.tong_phieu).toBe(0);
  });

  it("map SSI: kỳ theo ngày mổ (không Index)", () => {
    const row = mapNkbvDashboardCasFromViewRow({
      ngay_phat_hien: "2026-10-05",
      khoa_ghi_nhan_id: "khoa-ghi",
      verification_data: {
        classification: "SIP",
        ngay_phau_thuat: "2026-09-25",
        calculated_doe: "2026-09-28",
        attributed_khoa_id: "khoa-loa",
        is_positive: true,
      },
    });
    expect(row.report_date).toBe("2026-09-25");
  });

  it("LOA ưu tiên hơn khoa ghi nhận; thiếu LOA → fallback ghi nhận", () => {
    const withLoa = mapNkbvDashboardCasFromViewRow({
      khoa_ghi_nhan_id: "ghi",
      verification_data: { attributed_khoa_id: "loa" },
    });
    expect(matchNkbvDashboardLoaKhoa(withLoa, "loa", [])).toBe(true);
    expect(matchNkbvDashboardLoaKhoa(withLoa, "ghi", [])).toBe(false);
    const draft = mapNkbvDashboardCasFromViewRow({
      khoa_ghi_nhan_id: "ghi",
      verification_data: {},
    });
    expect(matchNkbvDashboardLoaKhoa(draft, "ghi", [])).toBe(true);
  });
});
