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
