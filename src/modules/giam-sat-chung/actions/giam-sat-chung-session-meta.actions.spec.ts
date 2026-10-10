import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteGiamSatChungSessions } from "./giam-sat-chung-session-meta.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  hasBypass: vi.fn(),
  getActorNhanSuId: vi.fn(),
  getActorAuthUserId: vi.fn(),
  logAdminAction: vi.fn(),
  revalidateGscPaths: vi.fn(),
  assertLock: vi.fn(),
  from: vi.fn(),
  sessionsSelectIn: vi.fn(),
  update: vi.fn(),
  updateEqId: vi.fn(),
  updateEqActive: vi.fn(),
  hardDelete: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  hasRBACAdminSupervisionBypass: mocks.hasBypass,
}));

vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: mocks.getActorNhanSuId,
  getActorAuthUserId: mocks.getActorAuthUserId,
}));

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.logAdminAction }));

vi.mock("../lib/revalidate-gsc-paths", () => ({
  revalidateGscPaths: mocks.revalidateGscPaths,
}));

vi.mock("@/lib/supervision-module-lock", () => ({
  assertSupervisionNotLockedForDate: mocks.assertLock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

describe("deleteGiamSatChungSessions (xóa mềm)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.hasBypass.mockResolvedValue(false);
    mocks.getActorNhanSuId.mockResolvedValue("ns-01");
    mocks.getActorAuthUserId.mockResolvedValue("auth-01");
    mocks.sessionsSelectIn.mockResolvedValue({
      data: [
        {
          id: "s1",
          nguoi_giam_sat_id: "ns-01",
          is_active: true,
          ngay_giam_sat: "2020-01-01",
          metadata: { bang_kiem_snapshot: { x: 1 } },
        },
      ],
      error: null,
    });
    mocks.updateEqActive.mockResolvedValue({ error: null });
    mocks.updateEqId.mockReturnValue({ eq: mocks.updateEqActive });
    mocks.update.mockReturnValue({ eq: mocks.updateEqId });
    mocks.from.mockImplementation(() => ({
      select: () => ({ in: mocks.sessionsSelectIn }),
      update: mocks.update,
      delete: mocks.hardDelete,
    }));
  });

  it("owner xóa mềm: is_active=false, giữ snapshot, ghi lý do + nhật ký, không xóa cứng", async () => {
    const result = await deleteGiamSatChungSessions(["s1"], { lyDo: "Nhập nhầm khoa" });

    expect(result).toEqual({ success: true });
    expect(mocks.hardDelete).not.toHaveBeenCalled();
    const patch = mocks.update.mock.calls[0][0];
    expect(patch.is_active).toBe(false);
    expect(patch.metadata.bang_kiem_snapshot).toEqual({ x: 1 });
    expect(patch.metadata.xoa).toMatchObject({ ly_do: "Nhập nhầm khoa", boi_nhan_su_id: "ns-01" });
    expect(mocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "GSC_SOFT_DELETE_SESSION", targetId: "s1", reason: "Nhập nhầm khoa" }),
    );
    expect(mocks.assertLock).toHaveBeenCalled();
  });

  it("từ chối khi thiếu lý do", async () => {
    for (const lyDo of [undefined, "", "  ", "ab"]) {
      const result = await deleteGiamSatChungSessions(["s1"], { lyDo });
      expect(result).toMatchObject({ success: false });
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("từ chối khi ngày báo cáo đã khóa sổ", async () => {
    mocks.assertLock.mockRejectedValueOnce(
      new Error("Dữ liệu giám sát đã bị khóa cứng để chốt báo cáo thi đua."),
    );

    const result = await deleteGiamSatChungSessions(["s1"], { lyDo: "Nhập nhầm" });

    expect(result.success).toBe(false);
    expect(String((result as { error?: string }).error ?? "")).toContain("khóa cứng");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("không phải chủ phiên thì bị chặn; admin bypass thì được xóa", async () => {
    mocks.getActorNhanSuId.mockResolvedValue("ns-other");
    const denied = await deleteGiamSatChungSessions(["s1"], { lyDo: "Nhập nhầm" });
    expect(denied).toMatchObject({ success: false });
    expect(mocks.update).not.toHaveBeenCalled();

    mocks.hasBypass.mockResolvedValue(true);
    const ok = await deleteGiamSatChungSessions(["s1"], { lyDo: "Nhập nhầm" });
    expect(ok).toEqual({ success: true });
    expect(mocks.revalidateGscPaths).toHaveBeenCalled();
  });
});
