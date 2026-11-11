import { beforeEach, describe, expect, it, vi } from "vitest";

/** NKBV-005: người chỉ có quyền GSC đọc MDRO/RCA bằng admin client → luôn bó theo khoa của họ, kể cả khi mang vai rộng. */
const mocks = vi.hoisted(() => ({ scope: vi.fn(), verify: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.scope }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verify }));

import { getNkbvCensusAccess } from "./nkbv-khoa-scope.server";

const K1 = "11111111-1111-4111-8111-111111111111";
const wide = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, roles: ["HOI_DONG_KSNK"] };

beforeEach(() => vi.clearAllMocks());

describe("getNkbvCensusAccess", () => {
  it("vai rộng nhưng không có quyền xem NKBV: chỉ khoa của mình", async () => {
    mocks.verify.mockRejectedValue(new Error("không có quyền"));
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: K1 });
    expect(await getNkbvCensusAccess()).toEqual({ restriction: { kind: "khoa", khoaId: K1 }, viaGscOnly: true });
  });

  it("vai rộng, không có quyền xem NKBV, chưa gán khoa: không thấy gì", async () => {
    mocks.verify.mockRejectedValue(new Error("không có quyền"));
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: null });
    expect(await getNkbvCensusAccess()).toEqual({ restriction: { kind: "none" }, viaGscOnly: true });
  });

  it("có quyền xem NKBV: giữ phạm vi theo vai, đọc qua RLS", async () => {
    mocks.verify.mockResolvedValue(undefined);
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: K1 });
    expect(await getNkbvCensusAccess()).toEqual({ restriction: { kind: "all" }, viaGscOnly: false });
  });
});
