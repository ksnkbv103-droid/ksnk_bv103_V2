import { describe, expect, it } from "vitest";
import { parseLisOrInternalPaste } from "./nkbv-lis-adapter";
import { buildViSinhTemplateTsv, normalizeKetQua } from "./nkbv-vi-sinh-template";

describe("nkbv-vi-sinh-template", () => {
  it("normalizeKetQua nhận DUONG_TINH / AM_TINH / NHIEU", () => {
    expect(normalizeKetQua("DUONG_TINH")).toBe("DUONG_TINH");
    expect(normalizeKetQua("âm tính")).toBe("AM_TINH");
    expect(normalizeKetQua("nhiễu")).toBe("NHIEU");
    expect(normalizeKetQua("xyz")).toBeNull();
  });

  it("parse mẫu cố định — thiếu cột nhận diện thì fail", () => {
    const bad = "ma_benh_nhan\ttac_nhan\nA\tE.coli";
    const res = parseLisOrInternalPaste(bad);
    expect(res.ok).toBe(false);
  });

  it("parse mẫu đầy đủ — lưu cả âm / dương / nhiễu", () => {
    const tsv = buildViSinhTemplateTsv();
    const res = parseLisOrInternalPaste(tsv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const kinds = new Set(res.rows.map((r) => r.ket_qua));
    expect(kinds.has("DUONG_TINH")).toBe(true);
    expect(kinds.has("AM_TINH")).toBe(true);
    expect(kinds.has("NHIEU")).toBe(true);
    expect(res.rows.every((r) => r.ma_benh_an && r.ma_xet_nghiem)).toBe(true);
  });
});
