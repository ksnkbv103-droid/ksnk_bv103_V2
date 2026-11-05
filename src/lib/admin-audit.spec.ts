import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuditThrottleCacheForTesting,
  logAdminAction,
  maskEmailForAudit,
} from "./admin-audit";

const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

describe("admin-audit helper", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    clearAuditThrottleCacheForTesting();
  });

  it("masks email for audit payload", () => {
    expect(maskEmailForAudit("alice@example.test")).toBe("a***@example.test");
    expect(maskEmailForAudit("")).toBe("");
  });

  it("throttles BREAK_GLASS_USED within the throttle window", async () => {
    await logAdminAction({
      action: "BREAK_GLASS_USED",
      actorUserId: "user-1",
      actorEmail: "bg@example.test",
      reason: "test_reason",
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);

    // Second call with same user, action, and reason is throttled
    await logAdminAction({
      action: "BREAK_GLASS_USED",
      actorUserId: "user-1",
      actorEmail: "bg@example.test",
      reason: "test_reason",
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);

    // Different actor is not blocked
    await logAdminAction({
      action: "BREAK_GLASS_USED",
      actorUserId: "user-2",
      actorEmail: "bg2@example.test",
      reason: "test_reason",
    });
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("does not throttle normal non-break-glass actions", async () => {
    await logAdminAction({
      action: "CHANGE_RBAC_ROLE",
      actorUserId: "user-1",
      targetTable: "sys_user_roles",
    });
    await logAdminAction({
      action: "CHANGE_RBAC_ROLE",
      actorUserId: "user-1",
      targetTable: "sys_user_roles",
    });
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("failClosed: ném lỗi khi insert audit thất bại", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "rls denied" } });
    await expect(
      logAdminAction({ action: "CHANGE_RBAC_MATRIX", actorUserId: "u1", failClosed: true }),
    ).rejects.toThrow(/rls denied/);
  });

  it("mặc định best-effort: không ném khi insert audit thất bại", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "rls denied" } });
    await expect(logAdminAction({ action: "CHANGE_RBAC_ROLE", actorUserId: "u1" })).resolves.toBeUndefined();
  });
});
