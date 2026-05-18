import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCongViec } from "./cong-viec.actions";

const mocks = vi.hoisted(() => {
  let updatePayload: Record<string, unknown> | null = null;
  return {
    verifyPermission: vi.fn(),
    hasBypass: vi.fn(),
    getActorNhanSuId: vi.fn(),
    revalidatePath: vi.fn(),
    from: vi.fn(),
    metaMaybeSingle: vi.fn(),
    updateSingle: vi.fn(),
    setUpdatePayload: (value: Record<string, unknown> | null) => {
      updatePayload = value;
    },
    getUpdatePayload: () => updatePayload,
  };
});

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  hasRBACAdminSupervisionBypass: mocks.hasBypass,
}));

vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: mocks.getActorNhanSuId,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

describe("updateCongViec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setUpdatePayload(null);
    mocks.hasBypass.mockResolvedValue(true);
    mocks.metaMaybeSingle.mockResolvedValue({ data: { cong_viec_cha_id: null }, error: null });
    mocks.updateSingle.mockResolvedValue({ data: { id: "cv-01" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== "fact_cong_viec") return {};
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mocks.metaMaybeSingle,
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          mocks.setUpdatePayload(payload);
          return {
            eq: () => ({
              select: () => ({
                single: mocks.updateSingle,
              }),
            }),
          };
        },
      };
    });
  });

  it("does not force is_active true on metadata update", async () => {
    const result = await updateCongViec("cv-01", {
      tieu_de: "Cập nhật tiêu đề",
    });

    expect(result.success).toBe(true);
    const payload = mocks.getUpdatePayload();
    expect(payload).toBeTruthy();
    expect(payload).toMatchObject({
      tieu_de: "Cập nhật tiêu đề",
    });
    expect(Object.prototype.hasOwnProperty.call(payload, "is_active")).toBe(false);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/quan-ly-cong-viec");
  });
});
