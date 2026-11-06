import { describe, expect, it } from "vitest";
import { buildDmStockSummary } from "./cssd-kho-hoa-chat-summary";

const dm = (id: string, nguong: number | null) => ({
  id, ma_hoa_chat: id, ten_hoa_chat: id, don_vi_tinh: null, nguong_ton_toi_thieu: nguong, loai_hoa_chat: "HOA_CHAT",
});

describe("buildDmStockSummary", () => {
  it("cộng tồn, lấy hạn gần nhất, gắn cờ", () => {
    const r = buildDmStockSummary(
      [dm("a", 10), dm("b", null)],
      [
        { dm_hoa_chat_id: "a", han_su_dung: "2026-12-01", ton_so_luong: 3 },
        { dm_hoa_chat_id: "a", han_su_dung: "2026-10-01", ton_so_luong: 4 },
        { dm_hoa_chat_id: "b", han_su_dung: "2026-11-10", ton_so_luong: 50 },
      ],
      "2026-10-28",
    );
    expect(r[0]).toMatchObject({ tong_ton: 7, han_gan_nhat: "2026-10-01", duoi_dinh_muc: true, qua_han: true });
    expect(r[1]).toMatchObject({ tong_ton: 50, duoi_dinh_muc: false, qua_han: false, sap_het_han: true });
  });
});
