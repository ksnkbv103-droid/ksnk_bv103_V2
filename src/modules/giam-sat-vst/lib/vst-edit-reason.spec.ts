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
    expect(isValidVstEditReason("abc")).toBe(true);
    expect(isValidVstEditReason("  sửa nhầm giờ  ")).toBe(true);
  });
});
