import { describe, expect, it } from "vitest";
import { enrichGscHistoryRows, mergeGscHistoryRowsWithSessionMetadata } from "./gsc-read-utils";

describe("mergeGscHistoryRowsWithSessionMetadata", () => {
  it("map rỗng trả nguyên rows; gắn metadata theo id", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(mergeGscHistoryRowsWithSessionMetadata(rows, new Map())).toBe(rows);
    const out = mergeGscHistoryRowsWithSessionMetadata(rows, new Map([["a", { x: 1 }]]));
    expect(out[0]).toEqual({ id: "a", metadata: { x: 1 } });
    expect(out[1]).toBe(rows[1]);
  });
});

describe("enrichGscHistoryRows", () => {
  it("điền nhãn phẳng, ngày dd/mm/yyyy, bang_kiem_label ưu tiên tên danh mục", () => {
    const [r] = enrichGscHistoryRows([
      {
        id: "abc",
        ngay_giam_sat: "2026-03-10",
        loai_bang_kiem: "BK1",
        ten_bang_kiem_hien_thi: "Bảng 1",
        ma_khoa_phong: "A05",
        ten_khoa_phong: "Khoa A",
      },
    ]);
    expect(r.date_str).toBe("10/03/2026");
    expect(r.bang_kiem_label).toBe("Bảng 1");
    expect(r.ma_khoa).toBe("A05");
    expect(r.khoa_name).toBe("Khoa A");
  });
  it("thiếu dữ liệu: fallback join lồng, '---' và '—'", () => {
    const [r] = enrichGscHistoryRows([{ id: "x", danh_muc_khu_vuc: { ten_danh_muc: "KV" } }, ]);
    expect(r.khoa_name).toBe("---");
    expect(r.khu_name).toBe("KV");
    expect(r.bang_kiem_label).toBe("—");
  });
});
