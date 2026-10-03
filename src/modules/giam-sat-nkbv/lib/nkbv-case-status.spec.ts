import { describe, expect, it } from "vitest";
import { isNkbvTerminalCaseStatus } from "./nkbv-case-status";

describe("isNkbvTerminalCaseStatus", () => {
  it("locks XAC_NHAN / LOAI_TRU / DA_DONG", () => {
    expect(isNkbvTerminalCaseStatus("XAC_NHAN")).toBe(true);
    expect(isNkbvTerminalCaseStatus("LOAI_TRU")).toBe(true);
    expect(isNkbvTerminalCaseStatus("DA_DONG")).toBe(true);
  });

  it("does not lock chờ / đang ghi (exact match — not substring)", () => {
    expect(isNkbvTerminalCaseStatus("CHO_XAC_NHAN")).toBe(false);
    expect(isNkbvTerminalCaseStatus("CHO_DUYET")).toBe(false);
    expect(isNkbvTerminalCaseStatus("DANG_GHI_NHAN")).toBe(false);
    expect(isNkbvTerminalCaseStatus("CHO_XAC_MINH")).toBe(false);
  });
});
