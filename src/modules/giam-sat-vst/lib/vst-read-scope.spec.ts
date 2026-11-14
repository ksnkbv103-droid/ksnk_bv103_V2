import { describe, expect, it, vi } from "vitest";
import { applyVstHistoryReadScope, assertVstHistoryAccess } from "./vst-read-scope";

function mockQuery() {
  const q = {
    eq: vi.fn((...args: unknown[]) => {
      q.last = { type: "eq", args };
      return q;
    }),
    or: vi.fn((...args: unknown[]) => {
      q.last = { type: "or", args };
      return q;
    }),
    last: null as { type: string; args: unknown[] } | null,
  };
  return q;
}

describe("applyVstHistoryReadScope", () => {
  it("không lọc cho admin", () => {
    const q = mockQuery();
    const out = applyVstHistoryReadScope(q, {
      isAdmin: true,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      actorKhoaId: "k1",
      actorNhanSuId: "ns1",
      roles: [],
      isGuestStatsOnly: false,
    });
    expect(out).toBe(q);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
  });

  it("khách thống kê: không trả dữ liệu lịch sử", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: ["KHACH_THONG_KE_GSTT"],
      isGuestStatsOnly: true,
    });
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("mạng lưới: or giám sát viên + khoa", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-a",
      actorNhanSuId: "ns-a",
      roles: [],
      isGuestStatsOnly: false,
    });
    expect(q.or).toHaveBeenCalledWith("nguoi_giam_sat_id.eq.ns-a,khoa_id.eq.khoa-a");
  });
});

// @dac-ta R1.34 — danh sách có danh tính chỉ ĐDT khoa quản lý + CB_KSNK; BGĐ (HOI_DONG_KSNK) chỉ thấy số liệu ẩn danh.
describe("applyVstHistoryReadScope — vai không phải mạng lưới/KSNK (VST-014)", () => {
  const base = {
    isAdmin: false,
    isNhanVienKsnk: false,
    isMangLuoiKsnk: false,
    isGuestStatsOnly: false,
    actorNhanSuId: "ns-a",
  };

  it("CHU_NHIEM_KHOA: chỉ thấy phiên của khoa mình", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, { ...base, actorKhoaId: "khoa-a", roles: ["CHU_NHIEM_KHOA"] });
    expect(q.eq).toHaveBeenCalledWith("khoa_id", "khoa-a");
  });

  it("CHU_NHIEM_KHOA chưa gắn khoa: không thấy phiên nào", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, { ...base, actorKhoaId: null, roles: ["CHU_NHIEM_KHOA"] });
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("HOI_DONG_KSNK: không đọc lịch sử có danh tính", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, { ...base, actorKhoaId: "khoa-a", roles: ["HOI_DONG_KSNK"] });
    expect(q.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
  });

  it("HOI_DONG_KSNK kiêm NHAN_VIEN_KSNK: giữ toàn viện", () => {
    const q = mockQuery();
    applyVstHistoryReadScope(q, {
      ...base,
      isNhanVienKsnk: true,
      actorKhoaId: "khoa-a",
      roles: ["HOI_DONG_KSNK", "NHAN_VIEN_KSNK"],
    });
    expect(q.eq).not.toHaveBeenCalled();
  });
});

describe("assertVstHistoryAccess — HOI_DONG_KSNK (VST-014)", () => {
  it("từ chối vai chỉ có HOI_DONG_KSNK", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: false,
      actorKhoaId: "k",
      actorNhanSuId: "n",
      roles: ["HOI_DONG_KSNK"],
    });
    expect(out.ok).toBe(false);
  });
});

describe("assertVstHistoryAccess", () => {
  it("từ chối khách thống kê", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: true,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: ["KHACH_THONG_KE_GSTT"],
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("khách");
  });

  it("cho phép nhân viên KSNK", () => {
    const out = assertVstHistoryAccess({
      isAdmin: false,
      isNhanVienKsnk: true,
      isMangLuoiKsnk: false,
      isGuestStatsOnly: false,
      actorKhoaId: null,
      actorNhanSuId: null,
      roles: [],
    });
    expect(out).toEqual({ ok: true });
  });
});
