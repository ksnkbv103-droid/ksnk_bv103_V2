import { describe, expect, it } from "vitest";
import { countCanChuY, filterKhoRows } from "./cssd-kho-hoa-chat-rows";
import type { DmStockSummary } from "./cssd-kho-hoa-chat-summary";

const base = { don_vi_tinh: null, nguong_ton_toi_thieu: null, tong_ton: 5, han_gan_nhat: null, duoi_dinh_muc: false, qua_han: false, sap_het_han: false };
const rows: DmStockSummary[] = [
  { ...base, id: "a", ma_hoa_chat: "HC1", ten_hoa_chat: "Cidex", loai_hoa_chat: "HOA_CHAT", duoi_dinh_muc: true },
  { ...base, id: "b", ma_hoa_chat: "VT1", ten_hoa_chat: "Găng tay", loai_hoa_chat: "VAT_TU" },
  { ...base, id: "c", ma_hoa_chat: "HC2", ten_hoa_chat: "Enzym", loai_hoa_chat: "HOA_CHAT", sap_het_han: true },
];
const cd = new Map([["b", 2]]);

describe("filterKhoRows", () => {
  it("lọc theo loại", () => {
    expect(filterKhoRows(rows, "VAT_TU", "", cd).map((r) => r.id)).toEqual(["b"]);
    expect(filterKhoRows(rows, "HOA_CHAT", "", cd).map((r) => r.id)).toEqual(["a", "c"]);
  });
  it("cần chú ý và chờ duyệt", () => {
    expect(filterKhoRows(rows, "CAN_CHU_Y", "", cd).map((r) => r.id)).toEqual(["a", "c"]);
    expect(countCanChuY(rows)).toBe(2);
    expect(filterKhoRows(rows, "CHO_DUYET", "", cd).map((r) => r.id)).toEqual(["b"]);
  });
  it("tìm theo mã hoặc tên", () => {
    expect(filterKhoRows(rows, "ALL", " găng ", cd).map((r) => r.id)).toEqual(["b"]);
  });
  it("tìm không dấu", () => {
    expect(filterKhoRows(rows, "ALL", "gang tay", cd).map((r) => r.id)).toEqual(["b"]);
  });
});
