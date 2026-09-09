import { describe, expect, it } from "vitest";
import { prepopulateBsiData, prepopulateUtiData } from "./nkbv-pathogen-rules";

describe("prepopulate* không thổi số", () => {
  it("BSI: commensal 0, không drawn_separate, CVC 0", () => {
    const d = prepopulateBsiData({
      tac_nhan_vi_khuan: "Staphylococcus epidermidis",
      ngay_vao_vien: "2026-01-01",
      ngay_phat_hien: "2026-01-20",
    });
    expect(d.commensal_culture_count).toBe(0);
    expect(d.commensal_drawn_separate).toBe(false);
    expect(d.cvc_placed_days).toBe(0);
    expect(d.cvc_active_on_event).toBe(false);
  });

  it("UTI: CFU 0, pathogen_count 0, Foley 0", () => {
    const d = prepopulateUtiData({
      tac_nhan_vi_khuan: "E. coli",
      ngay_vao_vien: "2026-01-01",
      ngay_phat_hien: "2026-01-20",
    });
    expect(d.urine_cfu_count).toBe(0);
    expect(d.pathogen_count).toBe(0);
    expect(d.foley_placed_days).toBe(0);
  });

  it("giữ số đã có trên phiếu", () => {
    const d = prepopulateUtiData({}, { urine_cfu_count: 100000, pathogen_count: 1 });
    expect(d.urine_cfu_count).toBe(100000);
    expect(d.pathogen_count).toBe(1);
  });
});
