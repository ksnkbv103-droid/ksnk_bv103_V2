import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), status: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn(async () => {}) }));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => null) }));
vi.mock("@/lib/master-data/validation", () => ({ normalizeAndValidateDmKhoaPhong: vi.fn(async (a: { idRaw: unknown }) => a.idRaw) }));
vi.mock("@/lib/master-data/fk-normalize", () => ({ normalizeHoSoNhanVienOptionalOrThrow: vi.fn(async () => null) }));
vi.mock("@/lib/validations", () => ({ giamSatNkbvCaSchema: { partial: () => ({ safeParse: () => ({ success: true }) }) } }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn(async () => ({ kind: "all" })),
  isNkbvBenhAnInScope: vi.fn(async () => true),
  NKBV_OUT_OF_SCOPE_ERROR: "Hồ sơ nằm ngoài khoa của bạn.",
}));
vi.mock("./giam-sat-nkbv-write.helpers", () => ({
  clean: (p: Record<string, unknown>) => ({ ...p }),
  validateLoaiTrangAndLyDo: vi.fn(async () => {}),
  callThamDinhRpc: vi.fn(),
  releaseViSinhStampsAfterHide: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: { id: "x" }, error: null });
      chain.maybeSingle = async () =>
        table === "v_nkbv_su_kien_full"
          ? { data: { trang_thai_ma: mocks.status() }, error: null }
          : { data: { trang_thai_id: "t1", ma_benh_an: null, khoa_ghi_nhan_id: null }, error: null };
      chain.update = (p: unknown) => {
        mocks.update(p);
        return chain;
      };
      return chain;
    },
  }),
}));

import { updateGiamSatNkbvCa } from "./giam-sat-nkbv-write.actions";

const payload = { ho_ten_benh_nhan: "A", loai_nkbv_id: "l1", ngay_phat_hien: "2026-11-01", verification_data: { x: 1 } };

beforeEach(() => vi.clearAllMocks());

describe("updateGiamSatNkbvCa (NKBV-002)", () => {
  it("không ghi verification_data từ client", async () => {
    mocks.status.mockReturnValue("CHO_XAC_MINH");
    const r = await updateGiamSatNkbvCa("id1", payload);
    expect(r.success).toBe(true);
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("verification_data");
  });

  it.each(["XAC_NHAN", "LOAI_TRU", "DA_DONG"])("chặn ca đã chốt %s", async (st) => {
    mocks.status.mockReturnValue(st);
    const r = await updateGiamSatNkbvCa("id1", payload);
    expect(r.success).toBe(false);
    expect((r as { error: string }).error).toContain("Ca đã chốt");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
