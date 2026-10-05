/**
 * ADM-01 — dựng lại lỗ đổi email đăng nhập qua cổng NHAN_SU.edit
 * (`saveNhanSuAction` → `syncStaffAuthEmail`).
 *
 * Cổng thật: không phải PHAN_QUYEN — chỉ cần NHAN_SU.edit (preset NV KSNK).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  syncStaffAuthEmail: vi.fn(),
  assertLoginEmailChangeAllowed: vi.fn(),
  logAdminAction: vi.fn(),
  buildSaveNhanSuMergedFields: vi.fn(),
  upsertMasterRow: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  from: vi.fn(),
  authUserHasAdminRole: vi.fn(),
}));

vi.mock("../../actions/verify-permission", () => ({
  verifyPermission: mocks.verifyPermission,
}));

vi.mock("@/lib/auth/staff-auth-email", () => ({
  syncStaffAuthEmail: mocks.syncStaffAuthEmail,
}));

vi.mock("./nhan-su-login-email.guard", async () => {
  const actual = await vi.importActual<typeof import("./nhan-su-login-email.guard")>(
    "./nhan-su-login-email.guard",
  );
  return {
    ...actual,
    assertLoginEmailChangeAllowed: mocks.assertLoginEmailChangeAllowed,
    authUserHasAdminRole: mocks.authUserHasAdminRole,
  };
});

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: mocks.logAdminAction,
  maskEmailForAudit: (e: string) => e,
}));

vi.mock("./nhan-su-write.helpers", () => ({
  buildSaveNhanSuMergedFields: mocks.buildSaveNhanSuMergedFields,
}));

vi.mock("../../danh-muc/actions/master-crud-core", () => ({
  upsertMasterRow: mocks.upsertMasterRow,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveNhanSuAction } from "./nhan-su-write.actions";

const KHOA_ID = "11111111-1111-4111-8111-111111111111";
const STAFF_ID = "22222222-2222-4222-8222-222222222222";

const basePayload = {
  id: STAFF_ID,
  ma_nv: "NV001",
  ho_ten: "Test User",
  khoa_id: KHOA_ID,
};

describe("saveNhanSuAction ADM-01 email gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.syncStaffAuthEmail.mockResolvedValue({ ok: true });
    mocks.logAdminAction.mockResolvedValue(undefined);
    mocks.authUserHasAdminRole.mockResolvedValue(false);
    mocks.buildSaveNhanSuMergedFields.mockResolvedValue({
      ma_nv: "NV001",
      ho_ten: "Test User",
      khoa_id: KHOA_ID,
    });
    mocks.upsertMasterRow.mockResolvedValue({ success: true });
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              khoa_id: KHOA_ID,
              to_id: null,
              chuc_vu_id: null,
              chuc_danh_id: null,
              vai_tro_he_thong_id: null,
              extra_data: { email: "old@example.test" },
              auth_user_id: "auth-target",
            },
            error: null,
          })),
        })),
      })),
    });
    mocks.createAdminSupabaseClient.mockReturnValue({ from: mocks.from });
  });

  it("blocks non-admin changing another user's login email (hole via NHAN_SU.edit)", async () => {
    mocks.assertLoginEmailChangeAllowed.mockRejectedValue(
      new Error("Chỉ quản trị hệ thống được đổi email đăng nhập."),
    );

    const res = await saveNhanSuAction({
      ...basePayload,
      email: "attacker@example.test",
      confirmActorPassword: "",
    } as never);

    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/quản trị hệ thống|đổi email/i);
    expect(mocks.syncStaffAuthEmail).not.toHaveBeenCalled();
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("blocks change toward break-glass email", async () => {
    mocks.assertLoginEmailChangeAllowed.mockRejectedValue(
      new Error("Không được đổi sang email quyền khẩn cấp."),
    );

    const res = await saveNhanSuAction({
      ...basePayload,
      email: "breakglass@example.test",
      confirmActorPassword: "pw",
    } as never);

    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/khẩn cấp/);
    expect(mocks.syncStaffAuthEmail).not.toHaveBeenCalled();
  });

  it("ADMIN with password can change non-admin email and logs audit", async () => {
    mocks.assertLoginEmailChangeAllowed.mockResolvedValue({
      actor: { id: "admin-1", email: "admin@example.test" },
      newEmail: "new@example.test",
      oldEmail: "old@example.test",
    });

    const res = await saveNhanSuAction({
      ...basePayload,
      email: "new@example.test",
      confirmActorPassword: "secret",
    } as never);

    expect(res.success).toBe(true);
    expect(mocks.syncStaffAuthEmail).toHaveBeenCalledWith(
      expect.anything(),
      "auth-target",
      "new@example.test",
    );
    expect(mocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHANGE_LOGIN_EMAIL",
        targetTable: "mdm_nhan_su",
        targetId: STAFF_ID,
      }),
    );
  });

  it("blocks deactivating a profile whose auth user is ADMIN", async () => {
    mocks.authUserHasAdminRole.mockResolvedValue(true);

    const res = await saveNhanSuAction({
      ...basePayload,
      is_active: false,
    } as never);

    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/quản trị|ADMIN|ngưng/i);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });
});
