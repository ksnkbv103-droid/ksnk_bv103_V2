import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Từ chối quyền: người không phải ADMIN / thiếu quyền module không chạm DB hay Auth.
 * Mỗi action phải trả `success: false` và KHÔNG tạo admin client (service role).
 */
const mocks = vi.hoisted(() => ({
  ensureRbacAdmin: vi.fn(),
  verifyPermission: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers", () => ({
  ensureRbacAdmin: mocks.ensureRbacAdmin,
}));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  verifyAnyPermission: mocks.verifyPermission,
  invalidateUserPermissionsCache: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
  createServerSupabaseUserClient: vi.fn(),
}));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.logAdminAction }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import {
  adminResetStaffPasswordAction,
  provisionStaffAuthAccount,
  setStaffKsnkRbacRole,
} from "./tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import { setupGuestStatsPilotAccountAction } from "./tai-khoan-nhan-su/actions/guest-stats-pilot.actions";
import {
  approveAccountAccessRequest,
  approveForgotResetRequest,
  rejectAccountAccessRequest,
} from "./nhan-su/actions/account-access-request.actions";
import { deleteBangKiem, deleteMultipleTieuChis, deleteTieuChi } from "./bang-kiem/actions/bang-kiem-write.actions";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const DENY = "Chỉ quản trị hệ thống được thao tác phân quyền / tài khoản.";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureRbacAdmin.mockRejectedValue(new Error(DENY));
  mocks.verifyPermission.mockRejectedValue(new Error("Bạn không có quyền [delete] trên module [BANG_KIEM]."));
});

describe("tài khoản — chỉ ADMIN", () => {
  it.each([
    ["tạo tài khoản", () => provisionStaffAuthAccount({ staffId: UUID, password: "12345678" })],
    ["đặt lại mật khẩu", () => adminResetStaffPasswordAction({ staffId: UUID, password: "12345678", confirmActorPassword: "x" })],
    ["gán vai trò", () => setStaffKsnkRbacRole({ staffId: UUID, roleName: "NHAN_VIEN_KSNK", confirmActorPassword: "x" })],
    ["tài khoản khách", () => setupGuestStatsPilotAccountAction({ password: "12345678" })],
    ["duyệt cấp tài khoản", () => approveAccountAccessRequest({ staffId: UUID, password: "12345678", confirmActorPassword: "x" })],
    ["duyệt đặt lại mật khẩu", () => approveForgotResetRequest({ staffId: UUID, password: "12345678", confirmActorPassword: "x" })],
    ["từ chối yêu cầu", () => rejectAccountAccessRequest({ staffId: UUID, reason: "không hợp lệ" })],
  ])("%s: bị từ chối, không chạm DB/Auth", async (_label, run) => {
    const res = await run();
    expect(res).toMatchObject({ success: false, error: DENY });
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });
});

describe("bảng kiểm — thiếu quyền module", () => {
  it.each([
    ["xóa bảng kiểm", () => deleteBangKiem(UUID)],
    ["xóa tiêu chí", () => deleteTieuChi(UUID, UUID)],
    ["xóa nhiều tiêu chí", () => deleteMultipleTieuChis([UUID])],
  ])("%s: bị từ chối, không chạm DB", async (_label, run) => {
    const res = (await run()) as { success: boolean };
    expect(res.success).toBe(false);
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled();
  });
});
