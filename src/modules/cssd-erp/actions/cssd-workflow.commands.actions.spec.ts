import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  updates: [] as unknown[],
  append: vi.fn(),
  rollbackError: null as { message: string } | null,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      update: (patch: { is_dong_bang: boolean }) => {
        mocks.updates.push(patch);
        // Lần đầu (khóa) trả select([...]); lần hai (hoàn tác) await trực tiếp sau eq.
        const eqResult = Object.assign(
          Promise.resolve({ error: patch.is_dong_bang ? null : mocks.rollbackError }),
          { select: async () => ({ data: [{ id: "q1" }], error: null }) },
        );
        return { eq: () => eqResult };
      },
    }),
  }),
  createServerSupabaseUserClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u", email: "op@b.c" } } }) },
  }),
}));
vi.mock("./cssd-action-common", () => ({
  revalidateCssdWorkflowSurfaces: vi.fn(),
  tableHasColumn: async () => true,
  appendQuyTrinhException: mocks.append,
}));
vi.mock("./cssd-scan.actions", () => ({ scanQR: vi.fn() }));
vi.mock("../workflow/application/cssd-workflow-application", () => ({
  executeRejectToPreviousStation: vi.fn(),
  fetchLatestActiveWorkflowByQr: async () => ({ id: "q1" }),
}));
vi.mock("./cssd-workflow-ops.actions", () => ({ unlockDongBangQuyTrinhByMaQr: vi.fn() }));
vi.mock("@/lib/cssd-server-gates", () => ({
  verifyCssdInventoryEdit: vi.fn(),
  verifyCssdWorkflowEdit: vi.fn(async () => undefined),
}));

import { cssdCommandFreezeSet } from "./cssd-workflow.commands.actions";

describe("cssdCommandFreezeSet (CSSD-009)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updates.length = 0;
    mocks.rollbackError = null;
  });

  it("ghi ngoại lệ không soft và giữ khóa khi thành công", async () => {
    mocks.append.mockResolvedValue({ ok: true });
    const res = await cssdCommandFreezeSet("b01", "kẹt máy");
    expect(res).toEqual({ success: true });
    expect(mocks.append.mock.calls[0][3]).toBeUndefined(); // không truyền { soft: true }
    expect(mocks.updates).toHaveLength(1);
  });

  it("ghi ngoại lệ lỗi thì hoàn tác is_dong_bang=false và báo lỗi", async () => {
    mocks.append.mockRejectedValue(new Error("rpc down"));
    await expect(cssdCommandFreezeSet("b01", "x")).rejects.toThrow(
      "Không ghi được lý do đóng băng, thao tác đã hủy.",
    );
    expect(mocks.updates).toHaveLength(2);
    expect((mocks.updates[0] as { is_dong_bang: boolean }).is_dong_bang).toBe(true);
    expect((mocks.updates[1] as { is_dong_bang: boolean }).is_dong_bang).toBe(false);
  });
});
