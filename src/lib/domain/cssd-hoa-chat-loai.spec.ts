import { describe, expect, it } from "vitest";
import { isHoaChatLoai, isVatTuLoai, loaiHoaChatLabel, matchesLoaiFilter } from "./cssd-hoa-chat-loai";

describe("cssd-hoa-chat-loai", () => {
  it("labels loai for UI", () => {
    expect(loaiHoaChatLabel("HOA_CHAT")).toContain("Hóa chất");
    expect(loaiHoaChatLabel("VAT_TU")).toContain("Vật tư");
  });

  it("filters hoa chat vs vat tu", () => {
    expect(matchesLoaiFilter("HOA_CHAT", "HOA_CHAT")).toBe(true);
    expect(matchesLoaiFilter("VAT_TU", "HOA_CHAT")).toBe(false);
    expect(isVatTuLoai("TEST")).toBe(true);
    expect(isHoaChatLoai(null)).toBe(true);
  });
});
