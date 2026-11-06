import { beforeEach, describe, expect, it, vi } from "vitest";

const logAdminAction = vi.fn();
const invalidate = vi.fn();
const rpc = vi.fn();
const rangeCalls: Array<[number, number]> = [];
let beforeTotal = 0;

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: (...a: unknown[]) => logAdminAction(...a) }));
vi.mock("./rbac-auth.helpers", () => ({
  ensureRbacAdmin: async () => ({ id: "admin-1", email: "a@bv103.vn" }),
}));
vi.mock("@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth", () => ({
  verifyCurrentActorPassword: async () => ({ ok: true }),
}));
vi.mock("./rbac-registry-sync", () => ({
  upsertRegistryPermissionsAndAdminMappings: async () => undefined,
  applyKsnkRolePermissionPresets: async () => undefined,
}));
vi.mock("@/lib/server-permission", () => ({ invalidateUserPermissionsCache: () => invalidate() }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => ({}),
  createAdminSupabaseClient: () => ({
    rpc: (...a: unknown[]) => rpc(...a),
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.in = () => b;
      b.order = () => b;
      b.maybeSingle = async () => ({ data: table === "sys_roles" ? { id: "role-admin" } : null, error: null });
      b.range = async (from: number, to: number) => {
        rangeCalls.push([from, to]);
        const n = Math.max(0, Math.min(to + 1, beforeTotal) - from);
        return {
          data: Array.from({ length: n }, (_, i) => ({ role_id: "r", permission_id: `p${from + i}` })),
          error: null,
        };
      };
      b.then = (res: (v: unknown) => unknown) => res({ data: [], error: null });
      return b;
    },
  }),
}));

import { saveFullRBACMatrix } from "./rbac.actions";

const ROLE = "11111111-1111-4111-8111-111111111111";
const PERM = "22222222-2222-4222-8222-222222222222";

describe("saveFullRBACMatrix — audit fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rangeCalls.length = 0;
    beforeTotal = 0;
    rpc.mockResolvedValue({ data: { success: true }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("audit lỗi: vẫn invalidate cache và trả success:false với thông báo rõ", async () => {
    logAdminAction.mockRejectedValueOnce(new Error("audit down"));
    const res = await saveFullRBACMatrix({ [ROLE]: [PERM] }, "pw");
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(false);
    expect((res as { error: string }).error).toContain("Đã lưu thay đổi quyền nhưng chưa ghi được nhật ký");
  });

  it("audit ok: success và invalidate", async () => {
    const res = await saveFullRBACMatrix({ [ROLE]: [PERM] }, "pw");
    expect(res.success).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("ảnh chụp trước >1000 dòng được phân trang đủ", async () => {
    beforeTotal = 2300;
    await saveFullRBACMatrix({ [ROLE]: [PERM] }, "pw");
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    const audit = logAdminAction.mock.calls[0][0] as { before: { count: number } };
    expect(audit.before.count).toBe(2300);
  });
});
