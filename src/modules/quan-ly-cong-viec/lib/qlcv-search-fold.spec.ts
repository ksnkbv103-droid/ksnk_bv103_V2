import { describe, expect, it } from "vitest";
import { foldQlcvSearch, matchesQlcvSearch, qlcvServerSearchTerm } from "./qlcv-search-fold";

describe("qlcv-search-fold", () => {
  it("bỏ dấu và đ", () => {
    expect(foldQlcvSearch("Kiểm tra Đường")).toBe("kiem tra duong");
  });
  it("tìm không dấu khớp có dấu, nhiều từ", () => {
    expect(matchesQlcvSearch(["Kiểm tra vệ sinh tay", "Nguyễn An"], "kiem tra nguyen")).toBe(true);
    expect(matchesQlcvSearch(["Kiểm tra"], "xyz")).toBe(false);
    expect(matchesQlcvSearch(["a"], "  ")).toBe(true);
  });
  it("mẫu server: không dấu → wildcard, có dấu → giữ", () => {
    expect(qlcvServerSearchTerm("soan bai")).toBe("s__n b__");
    expect(qlcvServerSearchTerm("Soạn")).toBe("Soạn");
  });
});
