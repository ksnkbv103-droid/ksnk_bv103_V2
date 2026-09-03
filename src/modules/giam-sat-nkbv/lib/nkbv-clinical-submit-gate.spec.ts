import { describe, expect, it } from "vitest";
import { assertClinicalEvidenceForSubmit } from "./nkbv-clinical-submit-gate";

describe("assertClinicalEvidenceForSubmit", () => {
  it("UTI thiếu khai báo triệu chứng → chặn", () => {
    const res = assertClinicalEvidenceForSubmit("UTI", {
      ngay_phat_hien: "2026-05-21",
      foley_placed_days: 3,
      foley_active_on_event: true,
    });
    expect(res.ok).toBe(false);
  });

  it("UTI có sốt trong IWP → cho qua", () => {
    const res = assertClinicalEvidenceForSubmit("UTI", {
      ngay_phat_hien: "2026-05-21",
      foley_placed_days: 3,
      foley_active_on_event: true,
      has_fever: true,
      symptom_dates: { has_fever: "2026-05-20" },
    });
    expect(res.ok).toBe(true);
  });

  it("UTI sốt ngoài IWP → chặn", () => {
    const res = assertClinicalEvidenceForSubmit("UTI", {
      ngay_phat_hien: "2026-05-21",
      foley_placed_days: 0,
      foley_active_on_event: false,
      has_fever: true,
      symptom_dates: { has_fever: "2026-05-01" },
    });
    expect(res.ok).toBe(false);
  });

  it("UTI khai báo không triệu chứng → cho qua (ASB / gửi KSNK)", () => {
    const res = assertClinicalEvidenceForSubmit("UTI", {
      ngay_phat_hien: "2026-05-21",
      foley_placed_days: 3,
      foley_active_on_event: true,
      has_fever: false,
      has_suprapubic_tenderness: false,
      has_costovertebral_pain: false,
      has_urgency: false,
      has_frequency: false,
      has_dysuria: false,
    });
    expect(res.ok).toBe(true);
  });

  it("VAE thiếu PEEP/FiO₂ → chặn", () => {
    const res = assertClinicalEvidenceForSubmit("VAE", {
      ngay_phat_hien: "2026-05-21",
      had_ventilator: true,
    });
    expect(res.ok).toBe(false);
  });

  it("VAE có bảng PEEP → cho qua", () => {
    const res = assertClinicalEvidenceForSubmit("VAE", {
      ngay_phat_hien: "2026-05-21",
      had_ventilator: true,
      vent_daily_params: [{ date: "2026-05-18", peep_min: 5, fio2_min: 40 }],
    });
    expect(res.ok).toBe(true);
  });

  it("SSI thiếu PATOS → chặn", () => {
    const res = assertClinicalEvidenceForSubmit("SSI", {
      ngay_phat_hien: "2026-05-21",
      ngay_phau_thuat: "2026-05-10",
    });
    expect(res.ok).toBe(false);
  });

  it("SSI đã trả lời PATOS không → cho qua", () => {
    const res = assertClinicalEvidenceForSubmit("SSI", {
      ngay_phat_hien: "2026-05-21",
      ngay_phau_thuat: "2026-05-10",
      is_patos: false,
    });
    expect(res.ok).toBe(true);
  });
});
