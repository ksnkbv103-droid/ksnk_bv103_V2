import { describe, expect, it } from "vitest";
import { filterKhuVucsForKhoa, type KhuVucSelectRow } from "./khu-vuc-giam-sat-ui";

const rows: KhuVucSelectRow[] = [
  { id: "1", ten_danh_muc: "ICU", ma_danh_muc: "ICU_DO", metadata: null },
  { id: "2", ten_danh_muc: "Hành lang", ma_danh_muc: "HL_XA", metadata: null },
  { id: "3", ten_danh_muc: "Chung", ma_danh_muc: "CHUNG", metadata: { is_common: true } },
];

describe("filterKhuVucsForKhoa", () => {
  it("returns all rows when allowed list is not configured (null)", () => {
    expect(filterKhuVucsForKhoa(rows, null)).toHaveLength(3);
  });

  it("returns only is_common when allowed list is empty", () => {
    expect(filterKhuVucsForKhoa(rows, []).map((r) => r.ma_danh_muc)).toEqual(["CHUNG"]);
  });

  it("keeps is_common and allowed codes only", () => {
    const out = filterKhuVucsForKhoa(rows, ["icu_do"]);
    expect(out.map((r) => r.ma_danh_muc)).toEqual(["ICU_DO", "CHUNG"]);
  });

  it("matches codes case-insensitively", () => {
    const out = filterKhuVucsForKhoa(rows, ["HL_XA"]);
    expect(out.map((r) => r.ma_danh_muc)).toEqual(["HL_XA", "CHUNG"]);
  });
});
