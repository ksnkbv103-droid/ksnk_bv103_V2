import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHoatDong } from "./hoat-dong.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  hasBypass: vi.fn(),
  getActorNhanSuId: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
  taskMaybeSingle: vi.fn(),
  insertHoatDong: vi.fn(),
}));

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

describe("createHoatDong", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.hasBypass.mockResolvedValue(false);
    mocks.getActorNhanSuId.mockResolvedValue("ns-01");
    mocks.taskMaybeSingle.mockResolvedValue({
      data: {
        id: "cv-01",
        nguoi_phu_trach_id: "ns-01",
        trang_thai: "CHO_DUYET",
      },
      error: null,
    });
    mocks.insertHoatDong.mockReturnValue({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: { id: "hd-01" },
          error: null,
        }),
      }),
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_fact_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.taskMaybeSingle,
            }),
          }),
        };
      }
      if (table === "fact_cong_viec_hoat_dong") {
        return {
          insert: mocks.insertHoatDong,
        };
      }
      return {};
    });
  });

  it("blocks progress update while task is waiting for acceptance", async () => {
    await expect(
      createHoatDong({
        id_cong_viec: "cv-01",
        loai_hoat_dong: "BAO_CAO_TIEN_DO",
        noi_dung: "Báo cáo nhanh",
        phan_tram_hoan_thanh: 45,
      }),
    ).rejects.toThrow("Việc đang chờ nghiệm thu — không ghi tiến độ tại đây.");

    expect(mocks.insertHoatDong).not.toHaveBeenCalled();
  });
});
