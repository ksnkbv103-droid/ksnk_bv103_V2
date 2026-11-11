import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ hideResult: vi.fn(), release: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn(async () => {}) }));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => "u1") }));
vi.mock("@/lib/master-data/validation", () => ({ normalizeAndValidateDmKhoaPhong: vi.fn() }));
vi.mock("@/lib/master-data/fk-normalize", () => ({ normalizeHoSoNhanVienOptionalOrThrow: vi.fn() }));
vi.mock("@/lib/validations", () => ({ giamSatNkbvCaSchema: {} }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn(async () => ({ kind: "all" })),
  isNkbvBenhAnInScope: vi.fn(async () => true),
  NKBV_OUT_OF_SCOPE_ERROR: "Hồ sơ nằm ngoài khoa của bạn.",
}));
vi.mock("./giam-sat-nkbv-write.helpers", () => ({
  clean: (p: Record<string, unknown>) => ({ ...p }),
  validateLoaiTrangAndLyDo: vi.fn(async () => {}),
  callThamDinhRpc: vi.fn(),
  releaseViSinhStampsAfterHide: mocks.release,
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      let isUpdate = false;
      chain.select = () => (isUpdate ? mocks.hideResult() : chain);
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data: { id: "c1", verification_data: {}, ma_benh_an: null, khoa_ghi_nhan_id: null },
        error: null,
      });
      chain.update = () => {
        isUpdate = true;
        return chain;
      };
      return chain;
    },
  }),
}));

import { softDeleteGiamSatNkbvCa } from "./giam-sat-nkbv-write.actions";

beforeEach(() => vi.clearAllMocks());

describe("softDeleteGiamSatNkbvCa (NKBV-009)", () => {
  it("ẩn phiếu lỗi thì không trả stamp vi sinh", async () => {
    mocks.hideResult.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await softDeleteGiamSatNkbvCa("c1");
    expect(r.success).toBe(false);
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("ẩn khớp 0 dòng thì không trả stamp", async () => {
    mocks.hideResult.mockResolvedValue({ data: [], error: null });
    const r = await softDeleteGiamSatNkbvCa("c1");
    expect(r.success).toBe(false);
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("ẩn xong rồi mới trả stamp; trả stamp lỗi thì báo rõ", async () => {
    mocks.hideResult.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    mocks.release.mockResolvedValue("rpc fail");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await softDeleteGiamSatNkbvCa("c1");
    expect(r.success).toBe(false);
    expect((r as { error: string }).error).toContain("Đã ẩn phiếu");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
