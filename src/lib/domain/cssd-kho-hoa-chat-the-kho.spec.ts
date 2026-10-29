import { describe, expect, it } from "vitest";
import { buildTheKho, type TheKhoInput } from "./cssd-kho-hoa-chat-the-kho";

const r = (id: string, q: number, at: string, tt = "DA_DUYET"): TheKhoInput => ({
  id, ma_phieu: `P-${id}`, loai_giao_dich: q > 0 ? "NHAP" : "XUAT", so_luong_co_dau: q,
  ma_lo: null, han_su_dung: null, trang_thai: tt, created_at: at,
});

describe("buildTheKho", () => {
  it("tồn lũy kế theo thời gian, bỏ phiếu chưa duyệt và từ chối", () => {
    const t = buildTheKho(
      [r("c", -30, "2026-10-03"), r("a", 100, "2026-10-01"), r("b", -20, "2026-10-02"), r("d", 50, "2026-10-04", "CHO_DUYET"), r("e", -5, "2026-10-05", "TU_CHOI")],
      50,
    );
    expect(t.ton_dau).toBe(0);
    expect(t.dong.map((d) => d.ton_sau)).toEqual([100, 80, 50]);
    expect(t.tong_nhap).toBe(100);
    expect(t.tong_xuat).toBe(50);
    expect(t.ton_cuoi).toBe(50);
  });
  it("danh sách bị cắt: tồn đầu bù để tồn cuối khớp tồn thật", () => {
    const t = buildTheKho([r("a", -10, "2026-10-02"), r("b", 5, "2026-10-03")], 40);
    expect(t.ton_dau).toBe(45);
    expect(t.ton_cuoi).toBe(40);
  });
  it("rỗng → tồn đầu = tồn hiện tại", () => {
    expect(buildTheKho([], 7)).toMatchObject({ ton_dau: 7, ton_cuoi: 7, dong: [] });
  });
});
