import { describe, expect, it } from "vitest";
import {
  computeCcs,
  computeTyLeGsc,
  computeTyLeVst,
  deltaFromTrend,
  rateFromTotals,
} from "./formulas";
import { gscCompliancePercentFromCounts } from "@/modules/giam-sat-chung/lib/gsc-score-display";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

describe("supervision-metrics formulas (tính tay đối chiếu)", () => {
  // Ca 1 (VST): Tính tỷ lệ tuân thủ làm tròn 1 chữ số thập phân. Mẫu số = 0 trả về null.
  describe("Ca 1: VST compliance rate (1 decimal place)", () => {
    it("round((da_tuan_thu / tong_co_hoi) * 100, 1): tính tay đối chiếu 2/3 = 66.7", () => {
      expect(rateFromTotals(2, 3)).toBe(66.7);
    });

    it("round((da_tuan_thu / tong_co_hoi) * 100, 1): tính tay đối chiếu 1/6 = 16.7, 5/6 = 83.3", () => {
      expect(rateFromTotals(1, 6)).toBe(16.7);
      expect(rateFromTotals(5, 6)).toBe(83.3);
    });

    it("tỷ lệ 0% và 100%", () => {
      expect(rateFromTotals(0, 10)).toBe(0);
      expect(rateFromTotals(10, 10)).toBe(100);
    });

    it("mẫu số bằng 0 trả về null", () => {
      expect(rateFromTotals(0, 0)).toBeNull();
      expect(rateFromTotals(5, 0)).toBeNull();
    });

    it("mẫu số âm hoặc tử số không hợp lệ trả về null", () => {
      expect(rateFromTotals(5, -1)).toBeNull();
      expect(rateFromTotals(NaN, 10)).toBeNull();
      expect(rateFromTotals(Infinity, 10)).toBeNull();
    });

    it("computeTyLeVst: mẫu số bằng 0 trả về null", () => {
      const kpis: VstStrategicPayload["kpis"] = {
        tong_phien: 0,
        tong_co_hoi: 0,
        da_tuan_thu: 0,
        bo_sot: 0,
        loi_ky_thuat: 0,
        loi_thoi_gian: 0,
        lam_dung_gang: 0,
        dung_ky_thuat: 0,
        du_thoi_gian: 0,
        ty_le_tuan_thu: 0,
        ty_le_dung_ky_thuat: 0,
        ty_le_du_thoi_gian: 0,
        ty_le_lam_dung_gang: 0,
      };
      expect(computeTyLeVst(kpis)).toBeNull();
      expect(computeTyLeVst(undefined)).toBeNull();
    });

    it("computeTyLeVst: tính đúng tỷ lệ 1 chữ số thập phân khi có dữ liệu", () => {
      const kpis: VstStrategicPayload["kpis"] = {
        tong_phien: 1,
        tong_co_hoi: 3,
        da_tuan_thu: 2,
        bo_sot: 1,
        loi_ky_thuat: 0,
        loi_thoi_gian: 0,
        lam_dung_gang: 0,
        dung_ky_thuat: 2,
        du_thoi_gian: 2,
        ty_le_tuan_thu: 66.67,
        ty_le_dung_ky_thuat: 100,
        ty_le_du_thoi_gian: 100,
        ty_le_lam_dung_gang: 0,
      };
      expect(computeTyLeVst(kpis)).toBe(66.7);
    });
  });

  // Ca 2 (GSC): Tính tỷ lệ tuân thủ làm tròn 2 chữ số thập phân.
  describe("Ca 2: GSC compliance rate (2 decimal places)", () => {
    it("gscCompliancePercentFromCounts: tính tay đối chiếu 2/3 = 66.67", () => {
      expect(gscCompliancePercentFromCounts(3, 2)).toBe(66.67);
    });

    it("gscCompliancePercentFromCounts: tính tay đối chiếu 5/7 = 71.43, 1/8 = 12.5", () => {
      expect(gscCompliancePercentFromCounts(7, 5)).toBe(71.43);
      expect(gscCompliancePercentFromCounts(8, 1)).toBe(12.5);
    });

    it("tỷ lệ 0% và 100%", () => {
      expect(gscCompliancePercentFromCounts(10, 0)).toBe(0);
      expect(gscCompliancePercentFromCounts(10, 10)).toBe(100);
    });

    it("mẫu số bằng 0 hoặc âm trả về null", () => {
      expect(gscCompliancePercentFromCounts(0, 0)).toBeNull();
      expect(gscCompliancePercentFromCounts(0, 5)).toBeNull();
      expect(gscCompliancePercentFromCounts(-10, 5)).toBeNull();
    });

    it("đầu vào không hợp lệ (NaN, undefined, null) trả về null", () => {
      expect(gscCompliancePercentFromCounts(NaN, 5)).toBeNull();
      expect(gscCompliancePercentFromCounts(10, NaN)).toBeNull();
      expect(gscCompliancePercentFromCounts(null, null)).toBeNull();
      expect(gscCompliancePercentFromCounts(undefined, undefined)).toBeNull();
    });

    it("computeTyLeGsc: mẫu số bằng 0 trả về null", () => {
      const kpis: GscStrategicPayload["kpis"] = {
        tong_phien: 0,
        tong_quan_sat: 0,
        tong_dat: 0,
        tong_vi_pham: 0,
        ty_le_tuan_thu: 0,
      };
      expect(computeTyLeGsc(kpis)).toBeNull();
      expect(computeTyLeGsc(undefined)).toBeNull();
    });

    it("computeTyLeGsc: tính đúng tỷ lệ 2 chữ số thập phân khi có dữ liệu", () => {
      const kpis: GscStrategicPayload["kpis"] = {
        tong_phien: 1,
        tong_quan_sat: 7,
        tong_dat: 5,
        tong_vi_pham: 2,
        ty_le_tuan_thu: 71.4,
      };
      expect(computeTyLeGsc(kpis)).toBe(71.43);
    });
  });

  // Ca 3 (CCS compat): Công thức computeCcs cân bằng 0.5 * VST + 0.5 * GSC; fallback khi chỉ có 1 nguồn.
  describe("Ca 3: CCS compat formula (0.5 * VST + 0.5 * GSC & fallback)", () => {
    it("cân bằng khi cả hai nguồn đều có giá trị", () => {
      const { value, note } = computeCcs(80, 90);
      expect(value).toBe(85);
      expect(note).toBe("Công thức: 50% Tuân thủ VST + 50% Tuân thủ GSC");
    });

    it("làm tròn 1 chữ số thập phân khi trung bình có số lẻ: 0.5*66.7 + 0.5*71.43 = 69.065 -> 69.1", () => {
      const { value } = computeCcs(66.7, 71.43);
      expect(value).toBe(69.1);
    });

    it("fallback khi chỉ có nguồn VST", () => {
      const { value, note } = computeCcs(75.5, null);
      expect(value).toBe(75.5);
      expect(note).toBe("Chỉ có dữ liệu VST trong phạm vi quyền/lọc");
    });

    it("fallback khi chỉ có nguồn GSC", () => {
      const { value, note } = computeCcs(null, 82.3);
      expect(value).toBe(82.3);
      expect(note).toBe("Chỉ có dữ liệu GSC trong phạm vi quyền/lọc");
    });

    it("trả về null khi cả hai nguồn đều null", () => {
      const { value, note } = computeCcs(null, null);
      expect(value).toBeNull();
      expect(note).toBeNull();
    });
  });

  // Ca 4 (Delta tuần): Tính chênh lệch deltaFromTrend giữa 2 tuần gần nhất.
  describe("Ca 4: Delta tuần (deltaFromTrend giữa 2 tuần gần nhất)", () => {
    it("tính đúng chênh lệch dương (tăng điểm %)", () => {
      expect(deltaFromTrend([70, 75.5])).toBe(5.5);
    });

    it("tính đúng chênh lệch âm (giảm điểm %)", () => {
      expect(deltaFromTrend([80, 74.2])).toBe(-5.8);
    });

    it("dãy nhiều tuần: chỉ lấy 2 tuần cuối cùng có giá trị", () => {
      expect(deltaFromTrend([60, 65, 80, 75.2])).toBe(-4.8);
      expect(deltaFromTrend([50, 55, 60, 65, 72.3])).toBe(7.3);
    });

    it("dãy có giá trị NaN xen kẽ: lọc bỏ NaN và lấy 2 tuần hợp lệ cuối cùng", () => {
      expect(deltaFromTrend([60, NaN, 70, 78.4])).toBe(8.4);
      expect(deltaFromTrend([65, 72.1, NaN])).toBe(7.1);
    });

    it("trả về null khi có ít hơn 2 điểm dữ liệu hợp lệ", () => {
      expect(deltaFromTrend([])).toBeNull();
      expect(deltaFromTrend([75.5])).toBeNull();
      expect(deltaFromTrend([NaN])).toBeNull();
      expect(deltaFromTrend([NaN, 80])).toBeNull();
      expect(deltaFromTrend([NaN, NaN])).toBeNull();
    });
  });
});
