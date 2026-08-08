import { describe, expect, it } from "vitest";
import { buildLegacyViSinhMd5Key, buildViSinhUniqueKey } from "./nkbv-vi-sinh-unique-key";

describe("buildViSinhUniqueKey", () => {
  it("dùng ma_xet_nghiem làm khóa", () => {
    expect(buildViSinhUniqueKey({ ma_xet_nghiem: "XN-1" })).toBe("XN-1");
    expect(buildViSinhUniqueKey({ ma_xet_nghiem: "  XN-1  " })).toBe("XN-1");
  });

  it("legacy MD5 vẫn ổn định cho dữ liệu cũ", () => {
    const a = buildLegacyViSinhMd5Key({
      ma_benh_nhan: "PID1",
      ma_benh_an: "BA1",
      ma_benh_pham: "BP1",
      tac_nhan: "E. coli",
    });
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });
});
