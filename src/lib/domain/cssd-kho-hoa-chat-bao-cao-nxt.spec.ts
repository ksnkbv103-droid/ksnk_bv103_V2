import { describe, expect, it } from "vitest";
import { buildBaoCaoNxt, type NxtDm, type NxtSoRow } from "./cssd-kho-hoa-chat-bao-cao-nxt";

const dms: NxtDm[] = [
  { id: "a", ma_hoa_chat: "HC1", ten_hoa_chat: "Enzyme", don_vi_tinh: "lít" },
  { id: "b", ma_hoa_chat: "HC2", ten_hoa_chat: "Cồn", don_vi_tinh: null },
];
const r = (id: string, q: number, ngay: string, ly: string | null = null): NxtSoRow => ({ dm_hoa_chat_id: id, so_luong_co_dau: q, ly_do_xuat: ly, ngay });

describe("buildBaoCaoNxt", () => {
  it("tách tồn đầu, nhập, xuất cấp sử dụng, xuất khác; bỏ sau kỳ", () => {
    const t = buildBaoCaoNxt(
      [r("a", 100, "2026-09-20"), r("a", -10, "2026-09-25", "CAP_SU_DUNG"), r("a", 50, "2026-10-05"), r("a", -20, "2026-10-10", "CAP_SU_DUNG"), r("a", -5, "2026-10-12", "VO_HONG"), r("a", -7, "2026-10-12"), r("a", 999, "2026-11-01")],
      dms, "2026-10-01", "2026-10-31",
    );
    expect(t).toEqual([
      { dm_hoa_chat_id: "a", ma_hoa_chat: "HC1", ten_hoa_chat: "Enzyme", don_vi_tinh: "lít", ton_dau: 90, nhap: 50, xuat_cap_su_dung: 27, xuat_khac: 5, ton_cuoi: 108 },
    ]);
  });
  it("ngày biên tu và den tính vào kỳ; mặt hàng không phát sinh bị ẩn nếu tồn 0", () => {
    const t = buildBaoCaoNxt([r("a", 5, "2026-10-01"), r("a", -5, "2026-10-31", "CAP_SU_DUNG"), r("b", 3, "2026-09-01"), r("b", -3, "2026-09-02", "CAP_SU_DUNG")], dms, "2026-10-01", "2026-10-31");
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ nhap: 5, xuat_cap_su_dung: 5, ton_cuoi: 0 });
  });
});
