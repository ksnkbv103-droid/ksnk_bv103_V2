import { describe, expect, it } from "vitest";
import { mocTuNhatKy } from "./me-tiet-khuan-moc";

describe("mocTuNhatKy", () => {
  it("map sự kiện sang bước, lấy dòng cuối; bỏ dòng lạ", () => {
    const m = mocTuNhatKy({
      nhat_ky: [
        { su_kien: "KET_THUC_NAP", ten: "A", thoi_gian: "2026-10-30T01:00:00Z" },
        { su_kien: "BAT_DAU_TIET_KHUAN", ten: "B", thoi_gian: "2026-10-30T01:05:00Z" },
        { su_kien: "GHI_TEST", ten: "C", thoi_gian: "2026-10-30T02:00:00Z" },
        { su_kien: "GHI_TEST", ten: "D", thoi_gian: "2026-10-30T02:01:00Z" },
        { su_kien: "KHAC", ten: "X", thoi_gian: "2026-10-30T02:01:00Z" },
      ],
    });
    expect(m[4]?.ten).toBe("A");
    expect(m[5]?.ten).toBe("B");
    expect(m[6]).toBeUndefined();
    expect(m[7]?.ten).toBe("D");
    expect(m[4]?.gio).toMatch(/08:00/);
  });
  it("không có nhật ký → rỗng", () => {
    expect(mocTuNhatKy(null)).toEqual({});
    expect(mocTuNhatKy({ nhat_ky: "x" })).toEqual({});
  });
});
