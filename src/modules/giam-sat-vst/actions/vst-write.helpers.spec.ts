import { describe, expect, it } from "vitest";
import {
  formatVstKhoaFkViolation,
  normalizeVstModeFields,
  validateVstModeFields,
  vstWriteErrorMessage,
} from "./vst-write.helpers";

describe("vst-write.helpers", () => {
  it("vstWriteErrorMessage", () => {
    expect(vstWriteErrorMessage(new Error("x"))).toBe("x");
    expect(vstWriteErrorMessage(1)).toBe("Lỗi không xác định");
  });
  it("normalize: nhãn khách quan legacy -> chuyên trách", () => {
    const r = normalizeVstModeFields({ hinh_thuc_giam_sat: "Giám sát khách quan", cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ" });
    expect(r.hinh).toBe("Giám sát chuyên trách");
  });
  it("normalize: cách thức nằm nhầm ở hình thức -> chuyên trách + chuyển sang cach", () => {
    const r = normalizeVstModeFields({ hinh_thuc_giam_sat: "Giám sát lại qua camera" });
    expect(r).toEqual({ hinh: "Giám sát chuyên trách", cach: "Giám sát lại qua camera", hinh_id: null, cach_id: null });
  });
  it("validate: hợp lệ không ném; sai hình thức / cách thức ném lỗi", () => {
    expect(() => validateVstModeFields("Tự giám sát", "Giám sát trực tiếp qua camera")).not.toThrow();
    expect(() => validateVstModeFields("Khác", "Giám sát trực tiếp tại chỗ")).toThrow(/Hình thức/);
    expect(() => validateVstModeFields("Tự giám sát", "Khác")).toThrow(/Cách thức/);
  });
  it("formatVstKhoaFkViolation", () => {
    expect(formatVstKhoaFkViolation(undefined)).toBe("");
    expect(formatVstKhoaFkViolation("lỗi lạ")).toBe("lỗi lạ");
    expect(formatVstKhoaFkViolation("giam_sat_vst_sessions_khoa_id_fkey")).toMatch(/orphan/);
    expect(formatVstKhoaFkViolation("giam_sat_vst_khoa_id_fkey")).toMatch(/mdm_dm_khoa_phong/);
  });
});
