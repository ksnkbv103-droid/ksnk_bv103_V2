import { describe, expect, it } from "vitest";
import { validateStationAdvance } from "../workflow/domain/cssd-state-engine";
import { isBOMChecklistEnabled } from "@/lib/bv103-feature-config";

describe("DONG_GOI workflow — không còn BOM gate mặc định", () => {
  it("cho phép QC → DONG_GOI", () => {
    expect(
      validateStationAdvance({ currentStatus: "QC", targetStation: "DONG_GOI" }).ok,
    ).toBe(true);
  });

  it("từ chối nhảy trạm TIEP_NHAN → DONG_GOI", () => {
    const r = validateStationAdvance({ currentStatus: "TIEP_NHAN", targetStation: "DONG_GOI" });
    expect(r.ok).toBe(false);
  });

  it("Digital BOM checklist tắt mặc định (chỉ bật khi env=1)", () => {
    expect(isBOMChecklistEnabled()).toBe(false);
  });
});
