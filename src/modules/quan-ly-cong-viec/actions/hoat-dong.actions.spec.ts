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
        is_active: true,
        phan_tram_hoan_thanh: 100,
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
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.taskMaybeSingle,
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec_hoat_dong") {
        return {
          insert: mocks.insertHoatDong,
        };
      }
      return {};
    });
  });

  it("blocks note while task is waiting for acceptance", async () => {
    await expect(
      createHoatDong({
        id_cong_viec: "cv-01",
        loai_hoat_dong: "BAO_CAO_TIEN_DO",
        noi_dung: "Ghi chú nhanh",
      }),
    ).rejects.toThrow("Việc đang chờ nghiệm thu — không ghi chú tiến độ tại đây.");

    expect(mocks.insertHoatDong).not.toHaveBeenCalled();
  });

  it("allows assignee to add note in DANG_LAM without updating fact row", async () => {
    mocks.taskMaybeSingle.mockResolvedValue({
      data: {
        id: "cv-01",
        nguoi_phu_trach_id: "ns-01",
        trang_thai: "DANG_LAM",
        is_active: true,
        phan_tram_hoan_thanh: 50,
      },
      error: null,
    });

    const result = await createHoatDong({
      id_cong_viec: "cv-01",
      loai_hoat_dong: "BAO_CAO_TIEN_DO",
      noi_dung: "Đã xong bước 1",
    });

    expect(result).toBeTruthy();
    expect(mocks.insertHoatDong).toHaveBeenCalledWith(
      expect.objectContaining({
        phan_tram_hoan_thanh: 50,
        noi_dung: "Đã xong bước 1",
      }),
    );
  });
});
