import { describe, expect, it } from "vitest";
import {
  isValidVstEditReason,
  normalizeVstEditReason,
  VST_EDIT_REASON_MIN_CHARS,
} from "./vst-edit-reason";

describe("vst-edit-reason", () => {
  it("chuẩn hóa trim", () => {
    expect(normalizeVstEditReason("  ab  ")).toBe("ab");
    expect(normalizeVstEditReason(null)).toBe("");
    expect(normalizeVstEditReason(undefined)).toBe("");
  });

  it(`hợp lệ khi ≥ ${VST_EDIT_REASON_MIN_CHARS} ký tự`, () => {
    expect(isValidVstEditReason("ab")).toBe(false);
    expect(isValidVstEditReason("  ab  ")).toBe(false);
    expect(isValidVstEditReason("abc")).toBe(false); // gate-ok: PO 2026-11-13 nâng ngưỡng 3 → 10 (R1.24)
    expect(isValidVstEditReason("  sửa nhầm giờ  ")).toBe(true);
  });

  // @dac-ta R1.24, R1.25 — PO 2026-11-13: lý do sửa/xóa theo đặc tả, tối thiểu 10 ký tự.
  it("ngưỡng 10 ký tự: 9 bị chặn, 10 qua", () => {
    expect(VST_EDIT_REASON_MIN_CHARS).toBe(10);
    expect(isValidVstEditReason("123456789")).toBe(false);
    expect(isValidVstEditReason("1234567890")).toBe(true);
  });
});
