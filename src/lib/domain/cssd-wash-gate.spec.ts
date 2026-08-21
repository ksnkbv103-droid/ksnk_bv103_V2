import { describe, expect, it } from "vitest";
import {
  parseWashRecord,
  validateWashInput,
  washAllowsAdvanceToQc,
} from "./cssd-wash-gate";

describe("cssd-wash-gate", () => {
  const okWash = {
    ket_qua: "DAT" as const,
    thiet_bi_id: "tb-1",
    dm_hoa_chat_id: "hc-1",
    ma_lo: "LO-01",
  };

  it("blocks QC when wash record is missing", () => {
    const r = washAllowsAdvanceToQc(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Chưa ghi nhận lần rửa/);
  });

  it("blocks QC when wash failed", () => {
    const r = washAllowsAdvanceToQc({ ...okWash, ket_qua: "KHONG_DAT" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/không đạt/i);
  });

  it("allows QC when wash DAT with machine and lot", () => {
    expect(washAllowsAdvanceToQc(okWash).ok).toBe(true);
    expect(parseWashRecord(okWash)?.ma_lo).toBe("LO-01");
  });

  it("rejects expired lot and non-washer machine", () => {
    expect(
      validateWashInput({
        thiet_bi_id: "tb",
        dm_hoa_chat_id: "hc",
        ma_lo: "L1",
        ket_qua: "DAT",
        lot_expired: true,
      }),
    ).toMatch(/hết hạn/);
    expect(
      validateWashInput({
        thiet_bi_id: "tb",
        is_washer: false,
        dm_hoa_chat_id: "hc",
        ma_lo: "L1",
        ket_qua: "DAT",
      }),
    ).toMatch(/rửa tự động|siêu âm/);
  });
});
