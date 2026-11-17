import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hideResult: vi.fn(),
  release: vi.fn(),
  roles: vi.fn(async () => [] as string[]),
  audit: vi.fn(async () => {}),
  status: { ma: "MOI" as string | null },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  getActorRoleNames: mocks.roles,
}));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.audit }));
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
        data: {
          id: "c1",
          verification_data: {},
          ma_benh_an: null,
          khoa_ghi_nhan_id: null,
          trang_thai_ma: mocks.status.ma,
        },
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.status.ma = "MOI";
});

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

describe("softDeleteGiamSatNkbvCa — ca đã chốt (NKBV-023, PO 2026-11-13)", () => {
  it("ca XAC_NHAN, người không phải ADMIN → từ chối, không ẩn", async () => {
    mocks.status.ma = "XAC_NHAN";
    mocks.roles.mockResolvedValue(["NHAN_VIEN_KSNK"]);
    const r = await softDeleteGiamSatNkbvCa("c1", "nhập trùng");
    expect(r.success).toBe(false);
    expect(mocks.hideResult).not.toHaveBeenCalled();
  });

  it("ca LOAI_TRU, ADMIN nhưng không có lý do → từ chối", async () => {
    mocks.status.ma = "LOAI_TRU";
    mocks.roles.mockResolvedValue(["ADMIN"]);
    const r = await softDeleteGiamSatNkbvCa("c1", "   ");
    expect(r.success).toBe(false);
    expect(mocks.hideResult).not.toHaveBeenCalled();
  });

  it("ca XAC_NHAN, ADMIN có lý do → ghi nhật ký kèm lý do rồi ẩn", async () => {
    mocks.status.ma = "XAC_NHAN";
    mocks.roles.mockResolvedValue(["ADMIN"]);
    mocks.hideResult.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    mocks.release.mockResolvedValue(null);
    const r = await softDeleteGiamSatNkbvCa("c1", "nhập trùng");
    expect(r.success).toBe(true);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "nhập trùng", targetId: "c1", failClosed: true }),
    );
  });

  it("ca chưa chốt: không cần ADMIN/lý do", async () => {
    mocks.hideResult.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    mocks.release.mockResolvedValue(null);
    const r = await softDeleteGiamSatNkbvCa("c1");
    expect(r.success).toBe(true);
    expect(mocks.roles).not.toHaveBeenCalled();
  });
});
