import { describe, expect, it } from "vitest";
import {
  catalogDeNghiTargetsOverlap,
  collectCatalogDeNghiTargetKeys,
  isEmptyDeNghiBeforeSnapshot,
  listDeNghiFieldDiffs,
} from "./cssd-catalog-de-nghi";

describe("listDeNghiFieldDiffs", () => {
  it("so sánh trường phẳng LOAI và bỏ __op", () => {
    const diffs = listDeNghiFieldDiffs(
      {
        __op: "UPDATE",
        ma_loai: "KEO",
        ten_loai: "Kéo cũ",
        is_chiu_nhiet: true,
      },
      {
        __op: "UPDATE",
        ma_loai: "KEO",
        ten_loai: "Kéo mới",
        is_chiu_nhiet: false,
      },
    );
    expect(diffs.map((d) => d.key)).toEqual(["is_chiu_nhiet", "ten_loai"]);
    const ten = diffs.find((d) => d.key === "ten_loai");
    expect(ten?.label).toBe("Tên loại");
    expect(ten?.beforeText).toBe("Kéo cũ");
    expect(ten?.afterText).toBe("Kéo mới");
    const nhiet = diffs.find((d) => d.key === "is_chiu_nhiet");
    expect(nhiet?.beforeText).toBe("Chịu nhiệt cao");
    expect(nhiet?.afterText).toBe("Nhạy nhiệt");
  });

  it("tóm tắt dòng BOM theo op gọn", () => {
    const diffs = listDeNghiFieldDiffs(
      { lines: [{ op: "UPSERT", maLoai: "KEO", tenDungCuLe: "Kéo", soLuong: 2 }] },
      {
        lines: [
          { op: "UPSERT", maLoai: "KEO", tenDungCuLe: "Kéo", soLuong: 4 },
          { op: "DELETE", maLoai: "KIM", tenDungCuLe: "Kim" },
        ],
      },
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0].key).toBe("lines");
    expect(diffs[0].label).toBe("Thành phần (BOM)");
    expect(diffs[0].beforeText).toContain("UPSERT: KEO · Kéo × 2");
    expect(diffs[0].afterText).toContain("UPSERT: KEO · Kéo × 4");
    expect(diffs[0].afterText).toContain("Xóa: KIM · Kim");
  });

  it("CREATE: before trống hiện — vs giá trị sau", () => {
    const diffs = listDeNghiFieldDiffs(
      { __op: "CREATE" },
      { __op: "CREATE", ma_bo: "BO01", ten_bo: "Bộ A" },
    );
    expect(diffs.map((d) => d.key).sort()).toEqual(["ma_bo", "ten_bo"]);
    expect(diffs.find((d) => d.key === "ma_bo")?.beforeText).toBe("—");
    expect(diffs.find((d) => d.key === "ma_bo")?.afterText).toBe("BO01");
  });
});

describe("collectCatalogDeNghiTargetKeys / overlap", () => {
  it("khóa id + mã cho LOAI đơn", () => {
    const keys = collectCatalogDeNghiTargetKeys({
      targetKind: "LOAI",
      targetId: "uuid-1",
      targetMa: "KEO",
      payloadAfter: { ma_loai: "KEO", ten_loai: "Kéo" },
    });
    expect(keys).toContain("LOAI:id:uuid-1");
    expect(keys).toContain("LOAI:ma:KEO");
  });

  it("MIXED: chồng mục theo ma bộ", () => {
    const a = collectCatalogDeNghiTargetKeys({
      targetKind: "MIXED",
      targetMa: "LO-2",
      payloadAfter: {
        items: [
          {
            kind: "BO",
            op: "UPDATE",
            targetMa: "BO01",
            before: { ten_bo: "A" },
            after: { ten_bo: "B" },
          },
        ],
      },
    });
    const b = collectCatalogDeNghiTargetKeys({
      targetKind: "BO",
      targetMa: "BO01",
      payloadAfter: { ten_bo: "C" },
    });
    expect(catalogDeNghiTargetsOverlap(a, b)).toBe(true);
  });

  it("không chồng khi khác mã", () => {
    const a = collectCatalogDeNghiTargetKeys({
      targetKind: "LOAI",
      targetMa: "KEO",
      payloadAfter: { ma_loai: "KEO" },
    });
    const b = collectCatalogDeNghiTargetKeys({
      targetKind: "LOAI",
      targetMa: "KIM",
      payloadAfter: { ma_loai: "KIM" },
    });
    expect(catalogDeNghiTargetsOverlap(a, b)).toBe(false);
  });
});

describe("isEmptyDeNghiBeforeSnapshot", () => {
  it("rỗng / chỉ __op", () => {
    expect(isEmptyDeNghiBeforeSnapshot({})).toBe(true);
    expect(isEmptyDeNghiBeforeSnapshot({ __op: "UPDATE" })).toBe(true);
    expect(isEmptyDeNghiBeforeSnapshot({ lines: [] })).toBe(true);
  });
  it("có trường trước duyệt", () => {
    expect(isEmptyDeNghiBeforeSnapshot({ ten_loai: "x" })).toBe(false);
    expect(isEmptyDeNghiBeforeSnapshot({ lines: [{ op: "UPSERT", maLoai: "A" }] })).toBe(false);
  });
});
