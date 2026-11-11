import { beforeEach, describe, expect, it, vi } from "vitest";

/** QT-009: tài khoản còn cờ must_change_password không được gắn hồ sơ nhân sự (tự động lẫn theo mã NV). */
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => {
  const chain = () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.is = () => q;
    q.update = (...a: unknown[]) => {
      mocks.update(...a);
      return q;
    };
    q.maybeSingle = mocks.maybeSingle;
    return q;
  };
  return {
    createAdminSupabaseClient: () => ({ from: () => chain() }),
    createServerSupabaseUserClient: async () => ({ auth: { getUser: mocks.getUser } }),
  };
});
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: vi.fn(), maskEmailForAudit: (e: string) => e }));
vi.mock("@/lib/auth/account-link-policy", () => ({
  canSelfLinkByEmail: () => true,
  PENDING_ADMIN_APPROVAL_MESSAGE: "chờ duyệt",
}));
vi.mock("@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers", () => ({
  ensureRbacAdmin: vi.fn().mockRejectedValue(new Error("không phải admin")),
}));

import { manualLinkAccountAction, syncAccountLinkAction } from "./account-link-governance.actions";

const flagged = { id: "u1", email: "a@bv103.vn", user_metadata: {}, app_metadata: { must_change_password: true } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: flagged } });
});

describe("QT-009 chặn gắn hồ sơ khi còn bị ép đổi mật khẩu", () => {
  it("tự liên kết theo email: không ghi auth_user_id", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null }) // chưa liên kết
      .mockResolvedValueOnce({ data: { id: "ns1", auth_user_id: null }, error: null }); // có hồ sơ khớp email
    const res = await syncAccountLinkAction();
    expect(res).toEqual({
      success: true,
      linked: false,
      message: "Đổi mật khẩu trước, sau đó mới liên kết được hồ sơ nhân viên.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("đã liên kết từ trước: vẫn báo linked (không khóa người do quản trị cấp)", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: "ns1" } });
    const res = await syncAccountLinkAction();
    expect(res).toMatchObject({ success: true, linked: true, nhanSuId: "ns1" });
  });

  it("liên kết theo mã NV: từ chối, không ghi", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null }); // chưa liên kết hồ sơ nào
    const res = await manualLinkAccountAction("nv1");
    expect(res).toEqual({ success: false, error: "Đổi mật khẩu trước, sau đó mới liên kết được hồ sơ nhân viên." });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
