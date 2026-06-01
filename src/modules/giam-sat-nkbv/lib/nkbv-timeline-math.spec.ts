import { describe, it, expect } from "vitest";
import { classifyPathogen } from "./nkbv-pathogen-rules";
import { calculateCdcMetrics } from "./nkbv-timeline-math";
import type { DepartmentStay } from "../types/nkbv-verification";

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
        symptoms_window_7days: true,
      },
      symptomDates: {
        symptoms_window_7days: "2026-05-12", // Day of transfer
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
        symptoms_window_7days: true,
      },
      symptomDates: {
        symptoms_window_7days: "2026-05-15", // 3 days after transfer
      },
      treatmentHistory,
    };

    const metrics = calculateCdcMetrics(input);

    expect(metrics.doe).toBe("2026-05-15");
    expect(metrics.attributedStay?.khoa_id).toBe("ICU"); // Attributes to ICU (current ward)
    expect(metrics.attributionReason).toContain("Quy kết cho khoa đang điều trị [ICU]");
  });
});
