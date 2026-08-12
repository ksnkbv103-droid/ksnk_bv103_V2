import { describe, it, expect } from "vitest";
import { classifyPathogen } from "./nkbv-pathogen-rules";
import { calculateCdcMetrics, isHaiSuspectByDay3Rule } from "./nkbv-timeline-math";
import type { DepartmentStay } from "../types/nkbv-verification";

describe("isHaiSuspectByDay3Rule (import LIS gate)", () => {
  it("POA: lấy mẫu ngày 1–2 không nghi HAI", () => {
    expect(isHaiSuspectByDay3Rule("2026-05-10", "2026-05-10")).toBe(false);
    expect(isHaiSuspectByDay3Rule("2026-05-10", "2026-05-11")).toBe(false);
  });

  it("HAI: lấy mẫu từ ngày lịch thứ 3 trở đi", () => {
    expect(isHaiSuspectByDay3Rule("2026-05-10", "2026-05-12")).toBe(true);
    expect(isHaiSuspectByDay3Rule("2026-05-10", "2026-05-15")).toBe(true);
  });

  it("thiếu ngày → không spawn ca", () => {
    expect(isHaiSuspectByDay3Rule(null, "2026-05-12")).toBe(false);
    expect(isHaiSuspectByDay3Rule("2026-05-10", "")).toBe(false);
  });
});

describe("Nkbv Pathogen Classification Rules", () => {
  it("should classify pathogens accurately", () => {
    const ecoli = classifyPathogen("Escherichia coli");
    expect(ecoli.isCommensal).toBe(false);
    expect(ecoli.isIntestinal).toBe(true);
    expect(ecoli.suggestedType).toBe("RECOGNIZED");

    const candida = classifyPathogen("Candida albicans");
    expect(candida.isCandidaOrParasite).toBe(true);
    expect(candida.isIntestinal).toBe(true);

    const staphHom = classifyPathogen("Staphylococcus hominis");
    expect(staphHom.isCommensal).toBe(true);
    expect(staphHom.suggestedType).toBe("COMMON_COMMENSAL");
  });
});

describe("Nkbv CDC Timeline & Location Attribution Math", () => {
  it("should calculate DOE and assign HAI/POA status based on admission Day 3 rule", () => {
    const treatmentHistory: DepartmentStay[] = [
      { khoa_id: "ICU", ten_khoa: "ICU", ngay_vao: "2026-05-10" }
    ];

    const input = {
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-10",
      checklistType: "UTI" as const,
      activeForm: {
        has_fever: true,
      },
      symptomDates: {
        has_fever: "2026-05-14",
      },
      treatmentHistory,
    };

    const metrics = calculateCdcMetrics(input);

    expect(metrics.doe).toBe("2026-05-14"); // Earliest symptom inside IWP [2026-05-12, 2026-05-18]
    expect(metrics.haiStatus).toBe("HAI");   // Day 5 of hospitalization >= 3
    expect(metrics.dayOfHospitalization).toBe(5);
    expect(metrics.attributedStay?.khoa_id).toBe("ICU");
  });

  it("should enforce LOA transfer rule within 24-48 hours", () => {
    const treatmentHistory: DepartmentStay[] = [
      { khoa_id: "CC", ten_khoa: "Cấp cứu", ngay_vao: "2026-05-10", ngay_ra: "2026-05-12" },
      { khoa_id: "ICU", ten_khoa: "ICU", ngay_vao: "2026-05-12" }
    ];

    const input = {
      ngay_phat_hien: "2026-05-13",
      ngay_vao_vien: "2026-05-10",
      checklistType: "BSI" as const,
      activeForm: {
        has_fever: true,
      },
      symptomDates: {
        has_fever: "2026-05-12", // Day of transfer
      },
      treatmentHistory,
    };

    const metrics = calculateCdcMetrics(input);

    expect(metrics.doe).toBe("2026-05-12");
    expect(metrics.attributedStay?.khoa_id).toBe("CC"); // Transferred to ICU on 12th, DOE is 12th -> attributes to CC (Cấp cứu)
    expect(metrics.attributionReason).toContain("Quy kết cho khoa chuyển đi [Cấp cứu]");
  });

  it("should attribute to current department if event occurs beyond 48 hours of transfer", () => {
    const treatmentHistory: DepartmentStay[] = [
      { khoa_id: "CC", ten_khoa: "Cấp cứu", ngay_vao: "2026-05-10", ngay_ra: "2026-05-12" },
      { khoa_id: "ICU", ten_khoa: "ICU", ngay_vao: "2026-05-12" }
    ];

    const input = {
      ngay_phat_hien: "2026-05-16",
      ngay_vao_vien: "2026-05-10",
      checklistType: "BSI" as const,
      activeForm: {
        has_fever: true,
      },
      symptomDates: {
        has_fever: "2026-05-15", // 3 days after transfer
      },
      treatmentHistory,
    };

    const metrics = calculateCdcMetrics(input);

    expect(metrics.doe).toBe("2026-05-15");
    expect(metrics.attributedStay?.khoa_id).toBe("ICU"); // Attributes to ICU (current ward)
    expect(metrics.attributionReason).toContain("Quy kết cho khoa đang điều trị [ICU]");
  });

  it("BSI: DOE ưu tiên has_fever trong IWP (không chỉ symptoms_window_7days)", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-10",
      checklistType: "BSI",
      activeForm: { has_fever: true, has_chills: true },
      symptomDates: { has_fever: "2026-05-13", has_chills: "2026-05-14" },
      treatmentHistory: [],
    });
    expect(metrics.doe).toBe("2026-05-13");
  });

  it("PNEU: DOE đọc ngày thở khó / hô hấp tại chỗ trong IWP", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-10",
      checklistType: "HAP",
      activeForm: {
        has_dyspnea: true,
        fever_or_wbc_abnormal: true,
        pneu_trigger: "CULTURE",
      },
      symptomDates: {
        has_dyspnea: "2026-05-14",
        fever_or_wbc_abnormal: "2026-05-15",
      },
      treatmentHistory: [],
    });
    expect(metrics.doe).toBe("2026-05-14");
  });

  it("UTI infant: ngày hạ thân nhiệt đóng góp DOE", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-10",
      checklistType: "UTI",
      activeForm: { is_infant_le1: true, has_infant_hypothermia: true },
      symptomDates: { has_infant_hypothermia: "2026-05-13" },
      treatmentHistory: [],
    });
    expect(metrics.doe).toBe("2026-05-13");
  });

  it("DOE: nhiều ngày cùng key → min ∈ IWP (không lấy ngày ngoài cửa sổ)", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-07-30",
      ngay_vao_vien: "2026-07-10",
      checklistType: "UTI",
      activeForm: { has_fever: true },
      symptomDates: {
        has_fever: ["2026-07-18", "2026-07-28"],
      },
      treatmentHistory: [],
      indexDateOverride: "2026-07-30",
    });
    expect(metrics.iwp_start).toBe("2026-07-27");
    expect(metrics.doe).toBe("2026-07-28");
  });

  it("clinical SBAP = Index−3 … DOE+13 (không neo DOE±3)", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-10",
      checklistType: "UTI",
      activeForm: { has_fever: true },
      symptomDates: { has_fever: "2026-05-12" }, // DOE = Index−3
      treatmentHistory: [],
      indexDateOverride: "2026-05-15",
    });
    expect(metrics.index_date).toBe("2026-05-15");
    expect(metrics.doe).toBe("2026-05-12");
    expect(metrics.sbap_start).toBe("2026-05-12"); // Index−3
    expect(metrics.sbap_end).toBe("2026-05-25"); // DOE+13
  });

  it("SSI SBAP vẫn [DOE−3, DOE+13]", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-05-15",
      ngay_vao_vien: "2026-05-01",
      checklistType: "SSI",
      activeForm: {
        ssi_depth: "SUPERFICIAL",
        superficial_purulent_drainage: true,
      },
      symptomDates: { superficial_purulent_drainage: "2026-05-14" },
      treatmentHistory: [],
    });
    expect(metrics.doe).toBe("2026-05-14");
    expect(metrics.sbap_start).toBe("2026-05-11");
    expect(metrics.sbap_end).toBe("2026-05-27");
  });

  it("CH17 IWP ±3 và uses_clinical_iwp", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-08-10",
      ngay_vao_vien: "2026-08-01",
      checklistType: "CH17",
      activeForm: { ch17_type_code: "GIT" },
      symptomDates: {},
      treatmentHistory: [],
    });
    expect(metrics.iwp_start).toBe("2026-08-07");
    expect(metrics.iwp_end).toBe("2026-08-13");
    expect(metrics.uses_clinical_iwp).toBe(true);
    expect(metrics.doe).toBe("2026-08-10");
  });

  it("CH17 ENDO IWP ±10", () => {
    const metrics = calculateCdcMetrics({
      ngay_phat_hien: "2026-08-10",
      ngay_vao_vien: "2026-08-01",
      checklistType: "CH17",
      activeForm: { ch17_type_code: "ENDO", ngay_ra_vien: "2026-08-30" },
      symptomDates: {},
      treatmentHistory: [],
    });
    expect(metrics.iwp_start).toBe("2026-07-31");
    expect(metrics.iwp_end).toBe("2026-08-20");
    expect(metrics.sbap_start).toBe("2026-07-31");
    expect(metrics.sbap_end).toBe("2026-08-30");
    expect(metrics.rit_end).toBe("2026-08-30");
  });
});
