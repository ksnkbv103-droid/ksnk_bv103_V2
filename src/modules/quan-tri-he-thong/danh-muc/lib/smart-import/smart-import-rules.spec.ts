import { describe, expect, it } from "vitest";
import {
  bomReplaceQty,
  dryRunParentPlaceholderId,
  mergeImportSpecs,
  smartImportRowsSchema,
} from "./smart-import-rules";

describe("smart-import-rules", () => {
  it("BOM: số lượng theo file, idempotent (không cộng dồn)", () => {
    expect(bomReplaceQty(3)).toBe(3);
    expect(bomReplaceQty("3")).toBe(3);
    expect(bomReplaceQty(bomReplaceQty(3))).toBe(3);
    expect(bomReplaceQty("")).toBe(1);
    expect(bomReplaceQty(undefined)).toBe(1);
    expect(bomReplaceQty(0)).toBe(1);
    expect(bomReplaceQty("abc")).toBe(1);
  });

  it("specs: giữ khóa cũ, file đè khóa trùng, gắn khóa định danh", () => {
    const merged = mergeImportSpecs(
      { ma_chi_tiet: "OLD", max_suds_count: 5, trong_luong: 10 },
      { trong_luong: 12 },
      "ma_chi_tiet",
      "NEW",
    );
    expect(merged).toEqual({ ma_chi_tiet: "NEW", max_suds_count: 5, trong_luong: 12 });
    expect(mergeImportSpecs(null, undefined, "k", "c")).toEqual({ k: "c" });
  });

  it("zod: từ chối rỗng, không phải object, quá trần", () => {
    expect(smartImportRowsSchema.safeParse([]).success).toBe(false);
    expect(smartImportRowsSchema.safeParse([1]).success).toBe(false);
    expect(smartImportRowsSchema.safeParse([{ a: 1 }]).success).toBe(true);
    expect(smartImportRowsSchema.safeParse(Array.from({ length: 5001 }, () => ({}))).success).toBe(false);
  });

  it("dry-run: id giữ chỗ không phải UUID", () => {
    expect(dryRunParentPlaceholderId("B1")).toBe("dry-run:B1");
  });
});
