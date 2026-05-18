import { describe, expect, it, vi } from "vitest";
import { applyVstHistoryReadScope } from "./vst-read-scope";

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
    });
    expect(out).toBe(q);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.or).not.toHaveBeenCalled();
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
    });
    expect(q.or).toHaveBeenCalledWith("nguoi_giam_sat_id.eq.ns-a,khoa_id.eq.khoa-a");
  });
});
