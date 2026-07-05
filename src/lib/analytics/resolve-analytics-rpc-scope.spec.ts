import { describe, expect, it } from "vitest";
import {
  resolveAnalyticsKhoaFilterLocked,
  resolveAnalyticsRpcFilters,
} from "./resolve-analytics-rpc-scope";
import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

const networkScope: ActorKsnkScope = {
  roles: ["THANH_VIEN_MANG_LUOI_KSNK"],
  actorNhanSuId: "ns-1",
  actorKhoaId: "khoa-a",
  isAdmin: false,
  isNhanVienKsnk: false,
  isMangLuoiKsnk: true,
  isGuestStatsOnly: false,
};

const guestScope: ActorKsnkScope = {
  roles: ["KHACH_THONG_KE_GSTT"],
  actorNhanSuId: "guest-1",
  actorKhoaId: null,
  isAdmin: false,
  isNhanVienKsnk: false,
  isMangLuoiKsnk: false,
  isGuestStatsOnly: true,
};

describe("resolveAnalyticsRpcFilters", () => {
  it("mạng lưới trên Thống kê VST dùng bộ lọc client", () => {
    const out = resolveAnalyticsRpcFilters(
      networkScope,
      { khoa_ids: ["k1", "k2"], khoi_ids: ["kh1"] },
      "vst",
    );
    expect(out.p_khoa_ids).toEqual(["k1", "k2"]);
    expect(out.p_khoi_ids).toEqual(["kh1"]);
  });

  it("mạng lưới trên Command Center vẫn khóa khoa", () => {
    const out = resolveAnalyticsRpcFilters(networkScope, { khoa_ids: ["k1"] }, "command-center");
    expect(out.p_khoa_ids).toEqual(["khoa-a"]);
    expect(out.p_khoi_ids).toBeNull();
  });

  it("khách dùng bộ lọc client trên GSC", () => {
    const out = resolveAnalyticsRpcFilters(guestScope, { khoa_ids: ["k9"] }, "gsc");
    expect(out.p_khoa_ids).toEqual(["k9"]);
  });
});

describe("resolveAnalyticsKhoaFilterLocked", () => {
  it("không khóa khoa trên tab Thống kê", () => {
    expect(resolveAnalyticsKhoaFilterLocked(networkScope, "vst")).toBe(false);
    expect(resolveAnalyticsKhoaFilterLocked(networkScope, "gsc")).toBe(false);
    expect(resolveAnalyticsKhoaFilterLocked(guestScope, "gsc")).toBe(false);
  });

  it("khóa khoa trên Command Center cho mạng lưới", () => {
    expect(resolveAnalyticsKhoaFilterLocked(networkScope, "command-center")).toBe(true);
  });
});
