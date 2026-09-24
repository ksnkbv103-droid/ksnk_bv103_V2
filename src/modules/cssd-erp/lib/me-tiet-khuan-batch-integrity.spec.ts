import { describe, expect, it } from "vitest";
import { assertSteamKitHeatAllowed } from "./me-tiet-khuan-batch-heat";
import {
  derivePassQuyTrinhIds,
  rejectIfMachineHasOpenBatch,
  rejectStartMember,
} from "./me-tiet-khuan-batch-integrity";

const BATCH = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("derivePassQuyTrinhIds", () => {
  it("suy danh sách bộ từ mẻ: active, đúng mẻ, trạm TIET_KHUAN", () => {
    const r = derivePassQuyTrinhIds(
      [
        { id: "a", is_active: true, lo_tiet_khuan_id: BATCH, ma_tram: "TIET_KHUAN" },
        { id: "b", is_active: true, lo_tiet_khuan_id: BATCH, ma_tram: "DONG_GOI" },
        { id: "c", is_active: false, lo_tiet_khuan_id: BATCH, ma_tram: "TIET_KHUAN" },
        { id: "d", is_active: true, lo_tiet_khuan_id: OTHER, ma_tram: "TIET_KHUAN" },
        { id: "e", is_active: true, lo_tiet_khuan_id: BATCH, ma_tram: "tiet_khuan" },
      ],
      BATCH,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toEqual(["a", "e"]);
  });

  it("mảng rỗng sau khi lọc bị từ chối kết luận ĐẠT", () => {
    const r = derivePassQuyTrinhIds(
      [{ id: "b", is_active: true, lo_tiet_khuan_id: BATCH, ma_tram: "DONG_GOI" }],
      BATCH,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/không kết luận ĐẠT/i);
  });
});

describe("assertSteamKitHeatAllowed", () => {
  it("fail-closed khi lỗi kiểm tra — không cho qua", () => {
    const r = assertSteamKitHeatAllowed({ isSteam: true, lines: null, loadError: true });
    expect(r.ok).toBe(false);
    const nonSteam = assertSteamKitHeatAllowed({ isSteam: false, lines: null, loadError: true });
    expect(nonSteam.ok).toBe(false);
  });

  it("máy hơi nước chặn thiếu dữ liệu chịu nhiệt và bộ nhạy nhiệt", () => {
    expect(assertSteamKitHeatAllowed({ isSteam: true, lines: [] }).ok).toBe(false);
    expect(
      assertSteamKitHeatAllowed({ isSteam: true, lines: [{ is_chiu_nhiet: null }] }).ok,
    ).toBe(false);
    expect(
      assertSteamKitHeatAllowed({ isSteam: true, lines: [{ is_chiu_nhiet: false }] }).ok,
    ).toBe(false);
    expect(
      assertSteamKitHeatAllowed({ isSteam: true, lines: [{ is_chiu_nhiet: true }] }).ok,
    ).toBe(true);
  });

  it("máy không phải hơi nước vẫn cho bộ nhạy nhiệt khi đã kiểm tra được", () => {
    expect(
      assertSteamKitHeatAllowed({ isSteam: false, lines: [{ is_chiu_nhiet: false }] }).ok,
    ).toBe(true);
  });
});

describe("rejectIfMachineHasOpenBatch", () => {
  it("chặn khi máy đã có mẻ chưa kết luận", () => {
    expect(rejectIfMachineHasOpenBatch("LOT-100001")).toMatch(/LOT-100001/);
    expect(rejectIfMachineHasOpenBatch(null)).toBeNull();
    expect(rejectIfMachineHasOpenBatch("  ")).toBeNull();
  });
});

describe("rejectStartMember", () => {
  it("từ chối bắt đầu khi bộ không ở ĐÓNG GÓI và nêu mã bộ", () => {
    const r = rejectStartMember({
      maQr: "B01.SET.9",
      tram: "QC",
      isActive: true,
      isDongBang: false,
    });
    expect(r).toMatch(/B01\.SET\.9/);
    expect(r).toMatch(/ĐÓNG GÓI/);
  });

  it("cho qua bộ ĐÓNG GÓI đang hiệu lực, không khóa", () => {
    expect(
      rejectStartMember({ maQr: "B01.SET.1", tram: "DONG_GOI", isActive: true, isDongBang: false }),
    ).toBeNull();
  });
});
