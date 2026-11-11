import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restriction: vi.fn(), inScope: vi.fn(), update: vi.fn(), insert: vi.fn(), eq: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn(async () => {}) }));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => "u1") }));
vi.mock("@/lib/master-data/validation", () => ({ normalizeAndValidateDmKhoaPhong: vi.fn(async (a: { idRaw: string }) => a.idRaw) }));
vi.mock("@/lib/master-data/fk-normalize", () => ({ normalizeHoSoNhanVienOptionalOrThrow: vi.fn() }));
vi.mock("@/lib/validations", () => ({ giamSatNkbvCaSchema: {} }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: mocks.restriction,
  isNkbvBenhAnInScope: mocks.inScope,
  NKBV_OUT_OF_SCOPE_ERROR: "Hồ sơ nằm ngoài khoa của bạn.",
}));
vi.mock("./giam-sat-nkbv-write.helpers", () => ({
  clean: (p: Record<string, unknown>) => ({ ...p }),
  validateLoaiTrangAndLyDo: vi.fn(),
  callThamDinhRpc: vi.fn(),
  releaseViSinhStampsAfterHide: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (...a: unknown[]) => {
        mocks.eq(...a);
        return chain;
      };
      chain.maybeSingle = async () => ({ data: null, error: null });
      chain.single = async () => ({ data: { id: "x" }, error: null });
      chain.update = (...a: unknown[]) => {
        mocks.update(...a);
        return chain;
      };
      chain.insert = (...a: unknown[]) => {
        mocks.insert(...a);
        return chain;
      };
      chain.upsert = async () => ({ error: null });
      chain.then = (res: (v: unknown) => void) => res({ error: null });
      return chain;
    },
  }),
}));

import {
  createNkbvBenhAnStay,
  syncNkbvAdmissionDate,
  updateNkbvBenhAnStay,
} from "./giam-sat-nkbv-write.actions";

const OUT = "Hồ sơ nằm ngoài khoa của bạn.";
beforeEach(() => vi.clearAllMocks());

describe("phạm vi khoa cho action ghi bệnh án (NKBV-010)", () => {
  it("syncNkbvAdmissionDate: ngoài phạm vi bị chặn, không ghi", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    mocks.inScope.mockResolvedValue(false);
    const r = await syncNkbvAdmissionDate({ ma_benh_an: "BA1", ngay_vao_vien: "2026-11-01" });
    expect(r).toEqual({ success: false, error: OUT });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("syncNkbvAdmissionDate: trong phạm vi thì ghi", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    mocks.inScope.mockResolvedValue(true);
    const r = await syncNkbvAdmissionDate({ ma_benh_an: "BA1", ngay_vao_vien: "2026-11-01" });
    expect(r.success).toBe(true);
    expect(mocks.update).toHaveBeenCalled();
  });

  it("syncNkbvAdmissionDate: ghi phiếu phải khóa theo mã BA đã kiểm phạm vi", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    mocks.inScope.mockResolvedValue(true);
    await syncNkbvAdmissionDate({ ma_benh_an: "BA1", su_kien_id: "ev-khoa-khac", ngay_vao_vien: "2026-11-01" });
    const calls = mocks.eq.mock.calls.map((c) => c.join("="));
    const iEv = calls.indexOf("id=ev-khoa-khac");
    expect(iEv).toBeGreaterThan(-1);
    expect(calls[iEv + 1]).toBe("ma_benh_an=BA1");
  });

  it("updateNkbvBenhAnStay: ngoài phạm vi bị chặn; restriction all chạy như cũ", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    mocks.inScope.mockResolvedValue(false);
    const blocked = await updateNkbvBenhAnStay({ ma_benh_an: "BA1", ho_ten_benh_nhan: "A" });
    expect(blocked).toEqual({ success: false, error: OUT });
    expect(mocks.update).not.toHaveBeenCalled();

    mocks.restriction.mockResolvedValue({ kind: "all" });
    mocks.inScope.mockResolvedValue(true);
    const ok = await updateNkbvBenhAnStay({ ma_benh_an: "BA1", ho_ten_benh_nhan: "A" });
    expect((ok as { error?: string }).error).toBe("Không tìm thấy hồ sơ bệnh án");
  });

  it("createNkbvBenhAnStay: khoa khác bị chặn, đúng khoa thì tạo", async () => {
    const input = { ma_benh_an: "BA9", ma_benh_nhan: "BN", ho_ten_benh_nhan: "A", ngay_vao_vien: "2026-11-01" };
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    const blocked = await createNkbvBenhAnStay({ ...input, khoa_dieu_tri_id: "k2" });
    expect(blocked).toEqual({ success: false, error: OUT });
    expect(mocks.insert).not.toHaveBeenCalled();

    const ok = await createNkbvBenhAnStay({ ...input, khoa_dieu_tri_id: "k1" });
    expect(ok.success).toBe(true);
    expect(mocks.insert).toHaveBeenCalled();
  });

  it("createNkbvBenhAnStay: bị giới hạn khoa mà không chọn khoa thì chặn, không giới hạn thì giữ hành vi cũ", async () => {
    const input = { ma_benh_an: "BA9", ma_benh_nhan: "BN", ho_ten_benh_nhan: "A", ngay_vao_vien: "2026-11-01" };
    const REQ = "Vui lòng chọn khoa điều trị — tài khoản của bạn bị giới hạn theo khoa.";
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    expect(await createNkbvBenhAnStay({ ...input, khoa_dieu_tri_id: null })).toEqual({ success: false, error: REQ });
    expect(await createNkbvBenhAnStay(input)).toEqual({ success: false, error: REQ });
    expect(mocks.insert).not.toHaveBeenCalled();

    mocks.restriction.mockResolvedValue({ kind: "all" });
    expect((await createNkbvBenhAnStay({ ...input, khoa_dieu_tri_id: null })).success).toBe(true);
  });

  it("updateNkbvBenhAnStay: bị giới hạn khoa mà xóa khoa điều trị thì chặn", async () => {
    const REQ = "Vui lòng chọn khoa điều trị — tài khoản của bạn bị giới hạn theo khoa.";
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    mocks.inScope.mockResolvedValue(true);
    expect(await updateNkbvBenhAnStay({ ma_benh_an: "BA1", khoa_dieu_tri_id: null })).toEqual({ success: false, error: REQ });
    expect(await updateNkbvBenhAnStay({ ma_benh_an: "BA1", khoa_dieu_tri_id: "" })).toEqual({ success: false, error: REQ });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
