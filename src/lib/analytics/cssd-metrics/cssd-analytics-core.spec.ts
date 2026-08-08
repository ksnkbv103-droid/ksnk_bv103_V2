import { describe, expect, it } from "vitest";
import {
  computeBoByKhoa,
  computeCapPhatByKhoaNhan,
  computeMeQcSummary,
  computeMayUsage,
  computeReuseFrequency,
  computeStaffScans,
  computeStationVolume,
  computeStationVolumeTrend,
  describeCssdCapPhatByKhoaNhan,
  describeCssdKhoaOwnershipProxy,
  pivotVolumeTrendTotals,
  roundIncidentFreeRate,
  stationTimeBucketKey,
  summarizeCssdAnalyticsBrief,
} from "./cssd-analytics-core";

describe("cssd-analytics-core", () => {
  it("stationTimeBucketKey buckets day/month/year", () => {
    expect(stationTimeBucketKey("2026-07-15T10:00:00Z", "day")).toBe("2026-07-15");
    expect(stationTimeBucketKey("2026-07-15T10:00:00Z", "month")).toBe("2026-07");
    expect(stationTimeBucketKey("2026-07-15T10:00:00Z", "year")).toBe("2026");
  });

  it("computeStationVolume counts completions by station timestamp in range", () => {
    const rows = [
      {
        id: "1",
        thoi_gian_tiep_nhan: "2026-07-10T08:00:00Z",
        thoi_gian_cap_phat: "2026-07-12T09:00:00Z",
      },
      {
        id: "2",
        thoi_gian_tiep_nhan: "2026-06-01T08:00:00Z",
        thoi_gian_cap_phat: "2026-07-20T09:00:00Z",
      },
    ];
    const vol = computeStationVolume(rows, "2026-07-01", "2026-07-31");
    const tn = vol.find((v) => v.station === "TIEP_NHAN");
    const cp = vol.find((v) => v.station === "CAP_PHAT");
    expect(tn?.completed).toBe(1);
    expect(cp?.completed).toBe(2);
  });

  it("computeStationVolumeTrend + pivot totals", () => {
    const rows = [
      { thoi_gian_cap_phat: "2026-07-01T10:00:00Z" },
      { thoi_gian_cap_phat: "2026-07-01T12:00:00Z" },
      { thoi_gian_cap_phat: "2026-07-15T12:00:00Z" },
    ];
    const points = computeStationVolumeTrend(rows, "2026-07-01", "2026-07-31", "day", "CAP_PHAT");
    expect(points).toEqual([
      { bucket: "2026-07-01", station: "CAP_PHAT", count: 2 },
      { bucket: "2026-07-15", station: "CAP_PHAT", count: 1 },
    ]);
    expect(pivotVolumeTrendTotals(points)).toEqual([
      { bucket: "2026-07-01", total: 2 },
      { bucket: "2026-07-15", total: 1 },
    ]);
  });

  it("computeBoByKhoa groups null khoa as Dùng chung", () => {
    const rows = computeBoByKhoa([
      { id: "a", khoa_su_dung_id: "k1", ten_khoa: "Khoa A", is_active: true },
      { id: "b", khoa_su_dung_id: "k1", ten_khoa: "Khoa A", is_active: true },
      { id: "c", khoa_su_dung_id: null, ten_khoa: null, is_active: true },
      { id: "d", khoa_su_dung_id: "k2", ten_khoa: "Khoa B", is_active: false },
    ]);
    expect(rows).toEqual([
      { khoa_key: "k1", ten_khoa: "Khoa A", so_bo: 2 },
      { khoa_key: "__CHUNG__", ten_khoa: "Dùng chung", so_bo: 1 },
    ]);
  });

  it("describeCssdKhoaOwnershipProxy ghi rõ ownership catalog", () => {
    const d = describeCssdKhoaOwnershipProxy([
      { khoa_key: "k1", ten_khoa: "Khoa A", so_bo: 5 },
      { khoa_key: "k2", ten_khoa: "Khoa B", so_bo: 2 },
    ]);
    expect(d.mode).toBe("ownership_catalog");
    expect(d.disclaimer).toMatch(/khoa_nhan_id|khoa nhận/);
    expect(d.summary).toMatch(/Khoa A/);
  });

  it("computeCapPhatByKhoaNhan counts destination in period", () => {
    const rows = computeCapPhatByKhoaNhan(
      [
        {
          khoa_nhan_id: "k1",
          ten_khoa_nhan: "Khoa A",
          thoi_gian_cap_phat: "2026-07-05T10:00:00Z",
        },
        {
          khoa_nhan_id: "k1",
          ten_khoa_nhan: "Khoa A",
          thoi_gian_cap_phat: "2026-07-06T10:00:00Z",
        },
        {
          khoa_nhan_id: null,
          ten_khoa_nhan: null,
          thoi_gian_cap_phat: "2026-07-07T10:00:00Z",
        },
      ],
      "2026-07-01",
      "2026-07-31",
    );
    expect(rows[0]).toMatchObject({ khoa_key: "k1", so_cap_phat: 2 });
    const d = describeCssdCapPhatByKhoaNhan(rows);
    expect(d.mode).toBe("destination_cap_phat");
    expect(d.summary).toMatch(/Khoa A/);
  });

  it("computeReuseFrequency ranks by suds then cycles", () => {
    const rows = [
      {
        bo_dung_cu_id: "b1",
        ma_bo: "B01.SET.01",
        ten_bo: "Bộ 1",
        ten_khoa: "Khoa A",
        suds_count: 12,
        thoi_gian_tiep_nhan: "2026-07-05T08:00:00Z",
      },
      {
        bo_dung_cu_id: "b1",
        ma_bo: "B01.SET.01",
        ten_bo: "Bộ 1",
        ten_khoa: "Khoa A",
        suds_count: 13,
        thoi_gian_tiep_nhan: "2026-07-20T08:00:00Z",
      },
      {
        bo_dung_cu_id: "b2",
        ma_bo: "B02.SET.01",
        ten_bo: "Bộ 2",
        suds_count: 40,
        thoi_gian_tiep_nhan: "2026-07-10T08:00:00Z",
      },
    ];
    const out = computeReuseFrequency(rows, "2026-07-01", "2026-07-31");
    expect(out[0]?.bo_dung_cu_id).toBe("b2");
    expect(out[0]?.suds_hien_tai).toBe(40);
    expect(out[1]?.chu_trinh_ky).toBe(2);
    expect(out[1]?.suds_hien_tai).toBe(13);
  });

  it("computeStaffScans counts per operator × station", () => {
    const rows = [
      {
        thoi_gian_lam_sach: "2026-07-02T08:00:00Z",
        nguoi_lam_sach_id: "u1",
      },
      {
        thoi_gian_lam_sach: "2026-07-03T08:00:00Z",
        nguoi_lam_sach_id: "u1",
      },
      {
        thoi_gian_qc: "2026-07-03T09:00:00Z",
        nguoi_kiem_tra_id: "u2",
      },
    ];
    const out = computeStaffScans(rows, "2026-07-01", "2026-07-31");
    expect(out.find((r) => r.nguoi_id === "u1" && r.station === "LAM_SACH")?.so_quet).toBe(2);
    expect(out.find((r) => r.nguoi_id === "u2" && r.station === "QC")?.so_quet).toBe(1);
  });

  it("computeMeQcSummary and may usage", () => {
    expect(
      computeMeQcSummary([
        { ket_qua_test: true },
        { ket_qua_test: true },
        { ket_qua_test: false },
        { ket_qua_test: null },
      ]),
    ).toEqual({
      so_me_ky: 4,
      so_me_da_qc: 3,
      so_me_dat: 2,
      ty_le_qc_dat_me: 66.7,
    });

    expect(
      computeMayUsage([
        { thiet_bi_id: "t1", ten_thiet_bi: "Hấp 1" },
        { thiet_bi_id: "t1", ten_thiet_bi: "Hấp 1" },
        { thiet_bi_id: "t2", ten_thiet_bi: "Hấp 2" },
      ]),
    ).toEqual([
      { thiet_bi_id: "t1", ten_thiet_bi: "Hấp 1", so_lan_dung: 2 },
      { thiet_bi_id: "t2", ten_thiet_bi: "Hấp 2", so_lan_dung: 1 },
    ]);
  });

  it("roundIncidentFreeRate and brief summary", () => {
    expect(roundIncidentFreeRate(100, 5)).toBe(95);
    expect(roundIncidentFreeRate(0, 0)).toBe(100);

    const brief = summarizeCssdAnalyticsBrief({
      stationVolume: [
        { station: "TIEP_NHAN", label: "TIEP NHAN", completed: 10 },
        { station: "LAM_SACH", label: "LAM SACH", completed: 9 },
        { station: "QC", label: "QC", completed: 8 },
        { station: "DONG_GOI", label: "DONG GOI", completed: 7 },
        { station: "TIET_KHUAN", label: "TIET KHUAN", completed: 6 },
        { station: "CAP_PHAT", label: "CAP PHAT", completed: 5 },
      ],
      tyLeQuyTrinhKhongSuCo: 95,
      soBo: 40,
      meQc: { so_me_ky: 12, so_me_da_qc: 10, so_me_dat: 9, ty_le_qc_dat_me: 90 },
      mayReady: 3,
      mayRepairing: 1,
      redAlertTotal: 2,
      frozenTotal: 1,
    });
    expect(brief.san_luong_cap_phat).toBe(5);
    expect(brief.tong_hoan_thanh_tram).toBe(45);
    expect(brief.ty_le_qc_dat_me).toBe(90);
  });
});
