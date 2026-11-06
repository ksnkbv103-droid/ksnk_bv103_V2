import { describe, expect, it } from "vitest";
import {
  computeThongKeKyHauCan,
  generateInsightsHauCan,
} from "./chat-thai-do-vai-core";
import { type SoCanRow, type SuCoRow, type NgayGiuongRow } from "../types";

describe("chat-thai-do-vai-core", () => {
  it("trả về 0 an toàn khi không có dữ liệu", () => {
    const res = computeThongKeKyHauCan([], [], [], "2026-11-01", "2026-11-07");
    expect(res.so_ngay_ky).toBe(7);
    expect(res.so_ngay_co_du_lieu).toBe(0);
    expect(res.ty_le_day_du_pct).toBe(0);
    expect(res.tong_ngay_giuong).toBe(0);
    expect(res.chat_thai.tong_chat_thai_kg).toBe(0);
    expect(res.chat_thai.ty_le_ctln_pct).toBe(0);
    expect(res.chat_thai.chat_thai_per_1000_ngay_giuong).toBe(0);
    expect(res.do_vai.tong_ban_kg).toBe(0);
    expect(res.do_vai.chenh_lech_kg).toBe(0);
  });

  it("tính toán chính xác 9 chỉ số cốt lõi và bỏ qua bản ghi không active hoặc ngoài kỳ", () => {
    const soCan: SoCanRow[] = [
      // Ngày 2026-11-01 (trong kỳ)
      { id: "1", ngay_can: "2026-11-01", loai_muc: "CT_LAY_NHIEM_SAC_NHON", khoi_luong_kg: 10, is_active: true, created_at: "" },
      { id: "2", ngay_can: "2026-11-01", loai_muc: "CT_LAY_NHIEM_CON_LAI", khoi_luong_kg: 30, is_active: true, created_at: "" },
      { id: "3", ngay_can: "2026-11-01", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 160, is_active: true, created_at: "" },
      { id: "4", ngay_can: "2026-11-01", loai_muc: "DO_VAI_BAN_THUONG", khoi_luong_kg: 350, is_active: true, created_at: "" },
      { id: "5", ngay_can: "2026-11-01", loai_muc: "DO_VAI_BAN_LAY_NHIEM", khoi_luong_kg: 50, is_active: true, created_at: "" },
      { id: "6", ngay_can: "2026-11-01", loai_muc: "DO_VAI_SACH_VE", khoi_luong_kg: 380, is_active: true, created_at: "" },

      // Ngày 2026-11-02 (trong kỳ)
      { id: "7", ngay_can: "2026-11-02", loai_muc: "CT_LAY_NHIEM_SAC_NHON", khoi_luong_kg: 5, is_active: true, created_at: "" },
      { id: "8", ngay_can: "2026-11-02", loai_muc: "CT_LAY_NHIEM_CON_LAI", khoi_luong_kg: 15, is_active: true, created_at: "" },
      { id: "9", ngay_can: "2026-11-02", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 80, is_active: true, created_at: "" },
      { id: "10", ngay_can: "2026-11-02", loai_muc: "DO_VAI_BAN_THUONG", khoi_luong_kg: 180, is_active: true, created_at: "" },
      { id: "11", ngay_can: "2026-11-02", loai_muc: "DO_VAI_BAN_LAY_NHIEM", khoi_luong_kg: 20, is_active: true, created_at: "" },
      { id: "12", ngay_can: "2026-11-02", loai_muc: "DO_VAI_SACH_VE", khoi_luong_kg: 190, is_active: true, created_at: "" },

      // Đã xoá mềm (is_active: false)
      { id: "13", ngay_can: "2026-11-02", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 999, is_active: false, created_at: "" },
      // Ngoài kỳ
      { id: "14", ngay_can: "2026-10-31", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 500, is_active: true, created_at: "" },
    ];

    const ngayGiuong: NgayGiuongRow[] = [
      { id: "g1", nam: 2026, thang: 11, so_ngay_giuong: 1000 },
    ];

    const suCo: SuCoRow[] = [
      { id: "s1", ngay_ghi_nhan: "2026-11-01", phan_he: "CHAT_THAI", loai_su_co: "TUI_RACH", is_active: true, created_at: "" },
      { id: "s2", ngay_ghi_nhan: "2026-11-02", phan_he: "DO_VAI", loai_su_co: "LAN_SAC_NHON_DO_VAI", is_active: true, created_at: "" },
      { id: "s3", ngay_ghi_nhan: "2026-11-02", phan_he: "DO_VAI", loai_su_co: "DO_VAI_RACH_HONG", is_active: false, created_at: "" }, // inactive
      { id: "s4", ngay_ghi_nhan: "2026-10-30", phan_he: "CHAT_THAI", loai_su_co: "PHAN_LOAI_SAI", is_active: true, created_at: "" }, // ngoài kỳ
    ];

    // Kỳ: 2 ngày 2026-11-01 -> 2026-11-02
    const stats = computeThongKeKyHauCan(soCan, ngayGiuong, suCo, "2026-11-01", "2026-11-02");

    expect(stats.so_ngay_ky).toBe(2);
    expect(stats.so_ngay_co_du_lieu).toBe(2);
    expect(stats.ty_le_day_du_pct).toBe(100);

    // Chất thải:
    // Sắc nhọn = 10 + 5 = 15 kg
    // Còn lại = 30 + 15 = 45 kg
    // CTLN tổng = 60 kg
    // Thông thường = 160 + 80 = 240 kg
    // Tổng CTYT = 300 kg
    // Tỷ lệ CTLN = 60 / 300 * 100 = 20%
    // kg / 1000 ngày giường = 300 / 1000 * 1000 = 300
    expect(stats.chat_thai.kg_sac_nhon).toBe(15);
    expect(stats.chat_thai.kg_con_lai).toBe(45);
    expect(stats.chat_thai.tong_ctln_kg).toBe(60);
    expect(stats.chat_thai.kg_thong_thuong).toBe(240);
    expect(stats.chat_thai.tong_chat_thai_kg).toBe(300);
    expect(stats.chat_thai.ty_le_ctln_pct).toBe(20);
    expect(stats.chat_thai.chat_thai_per_1000_ngay_giuong).toBe(300);
    expect(stats.chat_thai.so_su_co).toBe(1);

    // Đồ vải:
    // Bẩn thường = 350 + 180 = 530 kg
    // Bẩn lây nhiễm = 50 + 20 = 70 kg
    // Tổng bẩn = 600 kg
    // Tỷ lệ bẩn LN = 70 / 600 * 100 = 11.67%
    // Sạch về = 380 + 190 = 570 kg
    // Chênh lệch = 600 - 570 = 30 kg
    // Tỷ lệ chênh lệch = 30 / 600 * 100 = 5%
    // kg / 1000 ngày giường = 600 / 1000 * 1000 = 600
    expect(stats.do_vai.kg_ban_thuong).toBe(530);
    expect(stats.do_vai.kg_ban_lay_nhiem).toBe(70);
    expect(stats.do_vai.tong_ban_kg).toBe(600);
    expect(stats.do_vai.ty_le_ban_ln_pct).toBe(11.67);
    expect(stats.do_vai.kg_sach_ve).toBe(570);
    expect(stats.do_vai.chenh_lech_kg).toBe(30);
    expect(stats.do_vai.ty_le_chenh_lech_pct).toBe(5);
    expect(stats.do_vai.do_vai_per_1000_ngay_giuong).toBe(600);
    expect(stats.do_vai.so_su_co_chung).toBe(1);
    expect(stats.do_vai.so_su_co_sac_nhon).toBe(1);
  });

  it("sinh cảnh báo đúng ngưỡng quy định", () => {
    // Trường hợp 1: Có vật sắc nhọn trong đồ vải
    const statsWithSharps = computeThongKeKyHauCan(
      [],
      [],
      [{ id: "s1", ngay_ghi_nhan: "2026-11-01", phan_he: "DO_VAI", loai_su_co: "LAN_SAC_NHON_DO_VAI", is_active: true, created_at: "" }],
      "2026-11-01",
      "2026-11-01"
    );
    const insights1 = generateInsightsHauCan(statsWithSharps);
    expect(insights1.some((i) => i.muc === "NGUY_CO_CAO" && i.phanHe === "DO_VAI")).toBe(true);

    // Trường hợp 2: Tỷ lệ CTLN > 25%
    const statsHighInfectious = computeThongKeKyHauCan(
      [
        { id: "1", ngay_can: "2026-11-01", loai_muc: "CT_LAY_NHIEM_CON_LAI", khoi_luong_kg: 30, is_active: true, created_at: "" },
        { id: "2", ngay_can: "2026-11-01", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 70, is_active: true, created_at: "" }, // CTLN = 30%
      ],
      [],
      [],
      "2026-11-01",
      "2026-11-01"
    );
    const insights2 = generateInsightsHauCan(statsHighInfectious);
    expect(insights2.some((i) => i.muc === "CANH_BAO" && i.phanHe === "CHAT_THAI")).toBe(true);

    // Trường hợp 3: Chênh lệch bẩn - sạch > 15%
    const statsLinenLoss = computeThongKeKyHauCan(
      [
        { id: "1", ngay_can: "2026-11-01", loai_muc: "DO_VAI_BAN_THUONG", khoi_luong_kg: 100, is_active: true, created_at: "" },
        { id: "2", ngay_can: "2026-11-01", loai_muc: "DO_VAI_SACH_VE", khoi_luong_kg: 80, is_active: true, created_at: "" }, // chênh 20%
      ],
      [],
      [],
      "2026-11-01",
      "2026-11-01"
    );
    const insights3 = generateInsightsHauCan(statsLinenLoss);
    expect(insights3.some((i) => i.muc === "CANH_BAO" && i.phanHe === "DO_VAI")).toBe(true);

    // Trường hợp 4: Dữ liệu thiếu (< 70% trong kỳ ≥ 7 ngày)
    const statsIncomplete = computeThongKeKyHauCan(
      [
        { id: "1", ngay_can: "2026-11-01", loai_muc: "CT_THONG_THUONG", khoi_luong_kg: 50, is_active: true, created_at: "" },
      ],
      [],
      [],
      "2026-11-01",
      "2026-11-07" // 7 ngày, chỉ có 1 ngày nhập -> 14.3%
    );
    const insights4 = generateInsightsHauCan(statsIncomplete);
    expect(insights4.some((i) => i.muc === "THONG_TIN" && i.noiDung.includes("Độ đầy đủ dữ liệu"))).toBe(true);
  });
});
