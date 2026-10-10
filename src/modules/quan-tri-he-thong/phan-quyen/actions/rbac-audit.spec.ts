import { beforeEach, describe, expect, it, vi } from "vitest";

const logAdminAction = vi.fn();
const ensureRbacAdmin = vi.fn();
const upsertRegistry = vi.fn();
const applyPresets = vi.fn();

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: (...a: unknown[]) => logAdminAction(...a) }));
vi.mock("./rbac-auth.helpers", () => ({ ensureRbacAdmin: () => ensureRbacAdmin() }));
vi.mock("./rbac-registry-sync", () => ({
  upsertRegistryPermissionsAndAdminMappings: () => upsertRegistry(),
  applyKsnkRolePermissionPresets: () => applyPresets(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({}),
  createServerSupabaseUserClient: async () => ({}),
}));
vi.mock("@/lib/server-permission", () => ({ invalidateUserPermissionsCache: async () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { resetKsnkRolePermissionPresets, syncPermissionRegistry } from "./rbac.actions";

describe("rbac.actions — nhật ký quản trị", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureRbacAdmin.mockResolvedValue({ id: "admin-1", email: "admin@bv103.vn" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("đồng bộ registry thành công thì ghi SYNC_PERMISSION_REGISTRY", async () => {
    const res = await syncPermissionRegistry();
    expect(res.success).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SYNC_PERMISSION_REGISTRY", actorUserId: "admin-1" }),
    );
  });

  it("đặt lại gói quyền thành công thì ghi RESET_KSNK_ROLE_PRESETS", async () => {
    await resetKsnkRolePermissionPresets();
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RESET_KSNK_ROLE_PRESETS", actorUserId: "admin-1" }),
    );
  });

  it("thao tác lỗi thì không ghi audit và log có cấu trúc", async () => {
    upsertRegistry.mockRejectedValueOnce(new Error("db down"));
    const res = await syncPermissionRegistry();
    expect(res.success).toBe(false);
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[rbac] syncPermissionRegistry failed",
      expect.objectContaining({ module: "phan-quyen", userId: "admin-1", error: "db down" }),
    );
  });

  it("không phải admin thì không ghi audit", async () => {
    ensureRbacAdmin.mockRejectedValueOnce(new Error("Chỉ quản trị hệ thống được thao tác phân quyền / tài khoản."));
    const res = await resetKsnkRolePermissionPresets();
    expect(res.success).toBe(false);
    expect(applyPresets).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});
