import { beforeEach, describe, expect, it, vi } from "vitest";
import { importGiamSatChungData } from "./giam-sat-chung-import.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  getActorAuthUserId: vi.fn(),
  getActorKsnkScope: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
}));

vi.mock("@/lib/actor-auth-server", () => ({
  getActorAuthUserId: mocks.getActorAuthUserId,
}));

vi.mock("@/lib/actor-ksnk-scope-server", () => ({
  getActorKsnkScope: mocks.getActorKsnkScope,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("importGiamSatChungData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.getActorAuthUserId.mockResolvedValue("auth-user-01");
    mocks.getActorKsnkScope.mockResolvedValue({
      isMangLuoiKsnk: true,
      actorKhoaId: null,
    });
    mocks.from.mockReturnValue({
      select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("rejects import when network user has no khoa scope", async () => {
    const result = await importGiamSatChungData([
      {
        khoa_id: "khoa-01",
        khu_vuc_id: "kv-01",
      },
    ]);

    expect(result).toEqual({
      success: false,
      error: "Không xác định được phạm vi khoa của bạn.",
    });
    expect(mocks.verifyPermission).toHaveBeenCalledWith("GIAM_SAT_CHUNG", "import");
  });
});
