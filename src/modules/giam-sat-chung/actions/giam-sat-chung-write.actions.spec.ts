import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveGiamSatChung } from "./giam-sat-chung-write.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  getActorKsnkScope: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  hasRBACAdminSupervisionBypass: vi.fn(),
}));

vi.mock("@/lib/actor-ksnk-scope-server", () => ({
  getActorKsnkScope: mocks.getActorKsnkScope,
}));

vi.mock("@/lib/validations", () => ({
  gscSaveSessionSchema: {
    safeParse: () => ({ success: true, data: {} }),
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("saveGiamSatChung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.getActorKsnkScope.mockResolvedValue({
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-01",
    });
  });

  it("rejects create when requested khoa is out of actor scope", async () => {
    const result = await saveGiamSatChung(
      {
        khoa_id: "khoa-02",
        khu_vuc_id: "kv-01",
        loai_bang_kiem: "GSC",
      },
      [{ criterionId: "c1", value: "DAT" }],
    );

    expect(result).toEqual({
      success: false,
      error: "Khoa được yêu cầu nằm ngoài phạm vi được phép.",
    });
    expect(mocks.verifyPermission).toHaveBeenCalledWith("GIAM_SAT_CHUNG", "create");
  });
});
