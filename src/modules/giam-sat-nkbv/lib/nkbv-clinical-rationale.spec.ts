import { describe, it, expect } from "vitest";
import { buildClinicalDeduction } from "./nkbv-clinical-rationale";
import type { RuleEvaluationResult } from "./nkbv-rules-engine";
import type { CdcMetricsResult } from "./nkbv-timeline-math";

function mockCdcMetrics(overrides: Partial<CdcMetricsResult> = {}): CdcMetricsResult {
  return {
    doe: "2026-03-05",
    index_date: "2026-03-05",
    iwp_start: "2026-03-02",
    iwp_end: "2026-03-08",
    sbap_start: "2026-03-02",
    sbap_end: "2026-03-15",
    rit_end: "2026-03-18",
    dayOfHospitalization: 5,
    haiStatus: "HAI",
    attributedStay: {
      khoa_id: "khoa-hoi-suc",
      ten_khoa: "Khoa Hồi sức tích cực",
      ngay_vao: "2026-03-01",
    },
    attributionReason: "Ở khoa HSTC trên 48h",
    device_placed_days: 4,
    device_active_on_event: true,
    uses_clinical_iwp: true,
    ...overrides,
  };
}

describe("buildClinicalDeduction", () => {
  it("xây dựng đúng 5 bước suy luận cho ca CAUTI dương tính đạt chuẩn HAI Day-5", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: true,
      classification: "CAUTI",
      reason: "Đạt tiêu chuẩn SUTI 1a có đặt ống thông tiểu Foley liên tục >= 3 ngày",
    };

    const cdcMetrics = mockCdcMetrics();

    const row = {
      ngay_phat_hien: "2026-03-05",
      loai_benh_pham: "Nước tiểu qua sonde",
      tac_nhan_vi_khuan: "Escherichia coli",
      cfu_ml: "10^5 CFU/ml",
      ngay_vao_vien: "2026-03-01",
    };

    const positiveCriteria = [
      { label: "Sốt > 38°C", date: "2026-03-05" },
      { label: "Đau tức trên xương mu", date: "2026-03-05" },
    ];

    const deduction = buildClinicalDeduction({
      checklistType: "UTI",
      evaluation,
      cdcMetrics,
      row,
      positiveCriteria,
      ngayVaoVien: "2026-03-01",
    });

    expect(deduction.isPositive).toBe(true);
    expect(deduction.statusBadge).toBe("HAI_CONFIRMED");
    expect(deduction.steps).toHaveLength(5);

    // Bước 1: Vi sinh
    expect(deduction.steps[0].verdict).toBe("MET");
    expect(deduction.steps[0].details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Escherichia coli"),
        expect.stringContaining("10^5 CFU/ml"),
      ]),
    );

    // Bước 2: Triệu chứng trong IWP
    expect(deduction.steps[1].verdict).toBe("MET");
    expect(deduction.steps[1].summary).toContain("2 tiêu chí");

    // Bước 3: DOE
    expect(deduction.steps[2].verdict).toBe("MET");
    expect(deduction.steps[2].summary).toContain("05/03/2026");

    // Bước 4: Phân loại HAI & Khoa
    expect(deduction.steps[3].verdict).toBe("MET");
    expect(deduction.steps[3].summary).toContain("#5");
    expect(deduction.steps[3].details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Khoa Hồi sức tích cực"),
      ]),
    );

    // Bước 5: Thiết bị liên tục & RIT
    expect(deduction.steps[4].verdict).toBe("MET");
    expect(deduction.steps[4].summary).toContain("4 ngày lưu liên tục");

    // Khuyến cáo KSNK
    expect(deduction.ipcRecommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ống thông tiểu"),
      ]),
    );
  });

  it("phân loại đúng POA_EXCLUDED khi xuất hiện vào Day-1 hoặc Day-2", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: false,
      classification: "POA",
      reason: "Xuất hiện vào ngày thứ 1 của đợt nằm viện (POA)",
    };

    const cdcMetrics = mockCdcMetrics({
      doe: "2026-03-01",
      iwp_start: "2026-02-26",
      iwp_end: "2026-03-04",
      dayOfHospitalization: 1,
      haiStatus: "POA",
      device_placed_days: 0,
      device_active_on_event: false,
    });

    const row = {
      ngay_phat_hien: "2026-03-01",
      loai_benh_pham: "Đờm hút",
      tac_nhan_vi_khuan: "Klebsiella pneumoniae",
      ngay_vao_vien: "2026-03-01",
    };

    const deduction = buildClinicalDeduction({
      checklistType: "HAP",
      evaluation,
      cdcMetrics,
      row,
      ngayVaoVien: "2026-03-01",
    });

    expect(deduction.isPositive).toBe(false);
    expect(deduction.statusBadge).toBe("POA_EXCLUDED");
    expect(deduction.steps[3].verdict).toBe("EXCLUDED");
    expect(deduction.steps[3].summary).toContain("Hiện diện khi vào viện (POA)");
    expect(deduction.executiveSummary).toContain("Hiện diện khi vào viện (POA)");
  });

  it("loại trừ vi sinh ngoại nhiễm CONTAMINATION (ví dụ CoNS 1 mẫu)", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: false,
      classification: "CONTAMINATION",
      reason: "Vi khuẩn thường trú da (CoNS) chỉ có 1 lần cấy dương tính, không đủ 2 mẫu riêng biệt theo CDC LCBI 2",
    };

    const row = {
      ngay_phat_hien: "2026-03-04",
      loai_benh_pham: "Máu ngoại vi",
      tac_nhan_vi_khuan: "Staphylococcus epidermidis",
    };

    const deduction = buildClinicalDeduction({
      checklistType: "BSI",
      evaluation,
      cdcMetrics: null,
      row,
    });

    expect(deduction.isPositive).toBe(false);
    expect(deduction.statusBadge).toBe("CONTAMINATION");
    expect(deduction.steps[0].verdict).toBe("EXCLUDED");
    expect(deduction.steps[0].summary).toContain("ngoại nhiễm");
  });

  it("loại trừ nấm Candida spp. khỏi tiêu chuẩn CAUTI theo CDC/NHSN 2026", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: false,
      classification: "CANDIDA_EXCLUSION",
      reason: "Tác nhân là nấm men Candida albicans - CDC/NHSN loại trừ khỏi tiêu chuẩn CAUTI",
    };

    const row = {
      ngay_phat_hien: "2026-03-05",
      loai_benh_pham: "Nước tiểu",
      tac_nhan_vi_khuan: "Candida albicans",
      cfu_ml: "10^5 CFU/ml",
    };

    const deduction = buildClinicalDeduction({
      checklistType: "UTI",
      evaluation,
      cdcMetrics: null,
      row,
    });

    expect(deduction.isPositive).toBe(false);
    expect(deduction.statusBadge).toBe("RULED_OUT");
    expect(deduction.steps[0].verdict).toBe("EXCLUDED");
    expect(deduction.steps[0].summary).toContain("Candida spp.");
  });

  it("cảnh báo Secondary BSI khi cấy máu trùng tác nhân với ổ nhiễm khuẩn tại chỗ", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: false,
      classification: "SECONDARY_BSI",
      is_secondary_bsi: true,
      reason: "Cấy máu dương tính nằm trong cửa sổ SBAP và trùng tác nhân với ổ nhiễm khuẩn tại chỗ",
    };

    const cdcMetrics = mockCdcMetrics({
      doe: "2026-03-06",
      iwp_start: "2026-03-03",
      iwp_end: "2026-03-09",
      sbap_start: "2026-03-03",
      sbap_end: "2026-03-16",
      dayOfHospitalization: 6,
      haiStatus: "HAI",
      device_placed_days: 5,
      device_active_on_event: true,
    });

    const row = {
      ngay_phat_hien: "2026-03-06",
      loai_benh_pham: "Máu",
      tac_nhan_vi_khuan: "Pseudomonas aeruginosa",
    };

    const deduction = buildClinicalDeduction({
      checklistType: "BSI",
      evaluation,
      cdcMetrics,
      row,
    });

    expect(deduction.steps[4].details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("CẢNH BÁO SECONDARY BSI"),
      ]),
    );
  });

  it("ghi nhận cửa sổ Event Period 14 ngày và khuyến cáo Ventilator Bundle cho ca VAE", () => {
    const evaluation: RuleEvaluationResult = {
      is_positive: true,
      classification: "IVAC",
      reason: "Thỏa mãn tiêu chuẩn VAC + sốt/bạch cầu bất thường + kháng sinh mới >= 4 ngày",
    };

    const cdcMetrics = mockCdcMetrics({
      doe: "2026-03-07",
      iwp_start: "2026-03-05",
      iwp_end: "2026-03-09",
      dayOfHospitalization: 7,
      haiStatus: "HAI",
      device_placed_days: 6,
      device_active_on_event: true,
    });

    const row = {
      ngay_phat_hien: "2026-03-07",
      loai_benh_pham: "Dịch hút khí quản",
      tac_nhan_vi_khuan: "Acinetobacter baumannii",
    };

    const deduction = buildClinicalDeduction({
      checklistType: "VAE",
      evaluation,
      cdcMetrics,
      row,
    });

    expect(deduction.isPositive).toBe(true);
    expect(deduction.steps[1].details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Event Period 14 ngày"),
      ]),
    );
    expect(deduction.steps[2].details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PEEP hoặc FiO₂"),
      ]),
    );
    expect(deduction.ipcRecommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Ventilator Bundle"),
      ]),
    );
  });
});
