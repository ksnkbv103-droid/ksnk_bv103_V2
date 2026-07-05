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
