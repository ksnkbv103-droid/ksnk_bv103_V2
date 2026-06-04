import { describe, expect, it } from "vitest";
import {
  composeLookupCode,
  dedupeLookupCode,
  nextSequentialPrefixedCode,
  slugifyLookupCode,
} from "./lookup-code-prefix";

describe("lookup-code-prefix", () => {
  it("slugifyLookupCode bỏ dấu tiếng Việt", () => {
    expect(slugifyLookupCode("Kỹ thuật viên")).toBe("KY_THUAT_VIEN");
    expect(slugifyLookupCode("Phòng khám / TT")).toBe("PHONG_KHAM_TT");
  });

  it("composeLookupCode ghép prefix + slug", () => {
    expect(composeLookupCode("NN", "Bác sĩ")).toBe("NN_BAC_SI");
  });

  it("dedupeLookupCode thêm hậu tố khi trùng", () => {
    const existing = new Set(["NN_BAC_SI"]);
    expect(dedupeLookupCode("NN_BAC_SI", existing)).toBe("NN_BAC_SI_2");
  });

  it("nextSequentialPrefixedCode tăng seq", () => {
    const existing = new Set(["NN_BAC_SI", "NN_003", "DM-0005"]);
    expect(nextSequentialPrefixedCode("NN", existing)).toBe("NN_006");
  });
});
