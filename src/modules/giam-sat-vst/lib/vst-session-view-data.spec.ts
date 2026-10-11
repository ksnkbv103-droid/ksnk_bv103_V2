import { describe, expect, it } from "vitest";
import { buildVstViewDataFromDetail } from "./vst-session-view-data";

const dm = { ngheNghieps: [], khoas: [], khuVucs: [] } as never;

describe("buildVstViewDataFromDetail", () => {
  it("gom quan sát theo người; tách thoi_diem bằng dấu phẩy", () => {
    const r = buildVstViewDataFromDetail(
      {
        session: { id: "s1" },
        observations: [
          { nhan_vien_id: "nv1", thoi_diem: "TRƯỚC TXNB, SAU TXNB", hanh_dong: "Chà tay bằng cồn" },
          { nhan_vien_id: "nv1", thoi_diem: "SAU TXXQNB", hanh_dong: "Bỏ sót" },
          { ten_nhan_vien_ngoai: "Khách", thoi_diem: "" },
        ],
      },
      dm,
    );
    expect(r.persons).toHaveLength(2);
    const p0 = r.persons[0] as unknown as { opportunities: { thoi_diems: string[] }[] };
    expect(p0.opportunities).toHaveLength(2);
    expect(p0.opportunities[0].thoi_diems).toEqual(["TRƯỚC TXNB", "SAU TXNB"]);
    const p1 = r.persons[1] as unknown as { is_manual: boolean; opportunities: { thoi_diems: string[] }[] };
    expect(p1.is_manual).toBe(true);
    expect(p1.opportunities[0].thoi_diems).toEqual([]);
  });

  it("không có quan sát: persons rỗng, nhanSus mặc định []", () => {
    const r = buildVstViewDataFromDetail({ session: {} }, dm);
    expect(r.persons).toEqual([]);
    expect(r.nhanSus).toEqual([]);
  });

  it("quan sát thiếu cả id lẫn tên -> gom vào một người __MISSING_PERSON__", () => {
    const r = buildVstViewDataFromDetail({ session: {}, observations: [{ thoi_diem: "a" }, { thoi_diem: "b" }] }, dm);
    expect(r.persons).toHaveLength(1);
  });
});
