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

  it("rolls up progress to parent task when subtask reports progress", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    mocks.taskMaybeSingle.mockResolvedValue({
      data: {
        id: "cv-sub-01",
        nguoi_phu_trach_id: "ns-01",
        trang_thai: "DANG_LAM",
      },
      error: null,
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: () => vi.fn().mockResolvedValue({ error: null }),
    });

    mocks.from.mockImplementation((table: string) => {
      if (table === "v_fact_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockImplementation(() => {
                return {
                  data: {
                    id: "cv-parent-01",
                    trang_thai: "DANG_LAM",
                    trang_thai_id: "tt-dang-lam",
                    phan_tram_hoan_thanh: 10,
                    cong_viec_cha_id: null,
                  },
                  error: null,
                };
              }),
            }),
          }),
        };
      }
      if (table === "fact_cong_viec") {
        return {
          select: (fields: string) => {
            if (fields.includes("cong_viec_cha_id")) {
              return {
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { cong_viec_cha_id: "cv-parent-01" },
                    error: null,
                  }),
                }),
              };
            }
            return {
              eq: (col: string, val: string) => ({
                eq: () => Promise.resolve({
                  data: [
                    { id: "cv-sub-01", phan_tram_hoan_thanh: 80 },
                    { id: "cv-sub-02", phan_tram_hoan_thanh: 40 },
                  ],
                  error: null,
                }),
              }),
            };
          },
          update: updateMock,
        };
      }
      if (table === "dm_trang_thai_cong_viec") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "tt-dang-lam" } }),
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

    const result = await createHoatDong({
      id_cong_viec: "cv-sub-01",
      loai_hoat_dong: "BAO_CAO_TIEN_DO",
      noi_dung: "Xong 80%",
      phan_tram_hoan_thanh: 80,
    });

    expect(result).toBeTruthy();
    // Phải được gọi 2 lần (lần 1 cho task con 80%, lần 2 cho task cha 60%)
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls[1][0]).toMatchObject({
      phan_tram_hoan_thanh: 60,
    });
  });
});
