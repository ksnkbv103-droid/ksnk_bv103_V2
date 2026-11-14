import { describe, expect, it, vi } from "vitest";
import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";
import {
  applyGscHistoryReadScope,
  applyGscLoaiFilter,
  assertGscHistoryAccess,
  gscSessionVisibleToActor,
} from "./gsc-read-scope";

function mockQuery() {
  const q = {
    eq: vi.fn(() => q),
    or: vi.fn(() => q),
  };
  return q;
}

function scope(partial: Partial<ActorKsnkScope>): ActorKsnkScope {
  return {
    roles: [],
    actorNhanSuId: null,
    actorKhoaId: null,
    isAdmin: false,
    isNhanVienKsnk: false,
    isMangLuoiKsnk: false,
    isGuestStatsOnly: false,
    ...partial,
  };
}

describe("applyGscHistoryReadScope", () => {
  it("không lọc cho admin dù có cờ mạng lưới", () => {
    const q = mockQuery();
    applyGscHistoryReadScope(q, scope({ isAdmin: true, isMangLuoiKsnk: true, actorKhoaId: "k1" }));
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
  });

  it("mạng lưới thuần thấy phiên mình hoặc khoa mình", () => {
    const q = mockQuery();
    applyGscHistoryReadScope(
      q,
      scope({ isMangLuoiKsnk: true, actorNhanSuId: "ns1", actorKhoaId: "k1" }),
    );
    expect(q.or).toHaveBeenCalledWith("nguoi_giam_sat_id.eq.ns1,khoa_id.eq.k1");
  });

  it("khách không nhận dòng lịch sử", () => {
    const q = mockQuery();
    applyGscHistoryReadScope(q, scope({ isGuestStatsOnly: true }));
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });
});

describe("applyGscLoaiFilter", () => {
  it("tuân thủ gồm dòng loai null", () => {
    const q = mockQuery();
    applyGscLoaiFilter(q, "TUAN_THU");
    expect(q.or).toHaveBeenCalledWith("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
  });
});

describe("assertGscHistoryAccess", () => {
  it("chặn khách", () => {
    const out = assertGscHistoryAccess(scope({ isGuestStatsOnly: true }));
    expect(out.ok).toBe(false);
  });
});

describe("gscSessionVisibleToActor", () => {
  it("mạng lưới thấy phiên mình giám sát dù khác khoa", () => {
    const ok = gscSessionVisibleToActor(
      scope({ isMangLuoiKsnk: true, actorNhanSuId: "ns1", actorKhoaId: "k1" }),
      { khoa_id: "k-other", nguoi_giam_sat_id: "ns1" },
    );
    expect(ok).toBe(true);
  });

  it("mạng lưới không thấy phiên khoa khác do người khác giám sát", () => {
    const ok = gscSessionVisibleToActor(
      scope({ isMangLuoiKsnk: true, actorNhanSuId: "ns1", actorKhoaId: "k1" }),
      { khoa_id: "k-other", nguoi_giam_sat_id: "ns-other" },
    );
    expect(ok).toBe(false);
  });
});

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * VST-023 — HOI_DONG_KSNK (≈ BGĐ) chỉ đọc số liệu thống kê ẩn danh (M02 dòng 33 «X (ẩn)», R2.07/R2.08):
 * không đọc lịch sử, chi tiết, xuất thô GSC có danh tính. Cùng luật với VST-014.
 */
describe("VST-023 Hội đồng KSNK không đọc lịch sử GSC có danh tính", () => {
  const hoiDong = scope({ roles: ["HOI_DONG_KSNK"], actorNhanSuId: "ns1", actorKhoaId: "k1" });
  const phienKhoaKhac = { khoa_id: "k-other", nguoi_giam_sat_id: "ns-other" };

  it("assertGscHistoryAccess chặn HĐ thuần và nói rõ lý do ẩn danh", () => {
    const out = assertGscHistoryAccess(hoiDong);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("ẩn danh");
  });

  it("applyGscHistoryReadScope cho HĐ thuần 0 dòng", () => {
    const q = mockQuery();
    applyGscHistoryReadScope(q, hoiDong);
    expect(q.eq).toHaveBeenCalledWith("id", ZERO_UUID);
    expect(q.or).not.toHaveBeenCalled();
  });

  it("gscSessionVisibleToActor: HĐ thuần không mở được chi tiết phiên nào, kể cả phiên mình/khoa mình", () => {
    expect(gscSessionVisibleToActor(hoiDong, { khoa_id: "k1", nguoi_giam_sat_id: "ns1" })).toBe(false);
    expect(gscSessionVisibleToActor(hoiDong, phienKhoaKhac)).toBe(false);
  });

  // HĐ kiêm vai đọc rộng hơn: giữ quyền của vai rộng, không mất lịch sử chỉ vì mang thêm vai HĐ.
  const kiemVaiRong: Array<{ ten: string; partial: Partial<ActorKsnkScope> }> = [
    { ten: "ADMIN", partial: { isAdmin: true } },
    { ten: "NHAN_VIEN_KSNK", partial: { isNhanVienKsnk: true } },
    { ten: "CHU_NHIEM_KHOA", partial: { roles: ["HOI_DONG_KSNK", "CHU_NHIEM_KHOA"] } },
  ];
  it.each(kiemVaiRong)("HĐ kiêm $ten: không bị chặn, đọc toàn viện", ({ partial }) => {
    const s = { ...hoiDong, ...partial };
    expect(assertGscHistoryAccess(s).ok).toBe(true);
    const q = mockQuery();
    applyGscHistoryReadScope(q, s);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
    expect(gscSessionVisibleToActor(s, phienKhoaKhac)).toBe(true);
  });

  it("HĐ kiêm mạng lưới: không bị chặn, đọc theo phạm vi mạng lưới", () => {
    const s = { ...hoiDong, roles: ["HOI_DONG_KSNK", "MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    expect(assertGscHistoryAccess(s).ok).toBe(true);
    const q = mockQuery();
    applyGscHistoryReadScope(q, s);
    expect(q.or).toHaveBeenCalledWith("nguoi_giam_sat_id.eq.ns1,khoa_id.eq.k1");
    expect(gscSessionVisibleToActor(s, phienKhoaKhac)).toBe(false);
  });

  it("vai khác không có HĐ (ví dụ tổ trưởng CSSD) vẫn đọc như cũ", () => {
    const s = scope({ roles: ["TO_TRUONG_CSSD_TEST"] });
    expect(assertGscHistoryAccess(s).ok).toBe(true);
    const q = mockQuery();
    applyGscHistoryReadScope(q, s);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
    expect(gscSessionVisibleToActor(s, phienKhoaKhac)).toBe(true);
  });
});

/** CHU_NHIEM_KHOA = chủ nhiệm khoa KSNK ≡ TK_KSNK (M02 «X E» phiên giám sát): toàn viện như VST-026. */
describe("VST-023 CHU_NHIEM_KHOA kiêm mạng lưới đọc toàn viện", () => {
  it("không bị siết theo phạm vi mạng lưới", () => {
    const s = scope({
      roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"],
      isMangLuoiKsnk: true,
      actorNhanSuId: "ns1",
      actorKhoaId: "k1",
    });
    const q = mockQuery();
    applyGscHistoryReadScope(q, s);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
    expect(gscSessionVisibleToActor(s, { khoa_id: "k-other", nguoi_giam_sat_id: "ns-other" })).toBe(true);
  });
});
