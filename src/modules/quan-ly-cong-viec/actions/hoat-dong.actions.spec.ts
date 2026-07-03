import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHoatDong } from "./hoat-dong.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  hasBypass: vi.fn(),
  getActorNhanSuId: vi.fn(),
  revalidatePath: vi.fn(),
  from: vi.fn(),
  taskMaybeSingle: vi.fn(),
  appendNhatKy: vi.fn(),
  ensureQlcvKsnkAccess: vi.fn(),
  resolveQlcvListScope: vi.fn(),
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

vi.mock("../lib/qlcv-action-guard", () => ({
  ensureQlcvKsnkAccess: mocks.ensureQlcvKsnkAccess,
}));

vi.mock("../lib/qlcv-list-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/qlcv-list-scope")>();
  return {
    ...actual,
    resolveQlcvListScope: mocks.resolveQlcvListScope,
  };
});

vi.mock("../lib/qlcv-nhat-ky", () => ({
  appendQlcvNhatKy: mocks.appendNhatKy,
}));

describe("createHoatDong", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.hasBypass.mockResolvedValue(false);
    mocks.getActorNhanSuId.mockResolvedValue("ns-01");
    mocks.ensureQlcvKsnkAccess.mockImplementation(async () => ({
      supabase: { from: mocks.from },
      ksnkKhoaId: "ksnk-khoa-id",
    }));
    mocks.resolveQlcvListScope.mockResolvedValue({
      bypassAll: false,
      ksnkKhoaId: "ksnk-khoa-id",
      actorStaffId: "ns-01",
    });
    mocks.taskMaybeSingle.mockResolvedValue({
      data: {
        id: "cv-01",
        nguoi_phu_trach_id: "ns-01",
        trang_thai: "CHO_DUYET",
        is_active: true,
        phan_tram_hoan_thanh: 100,
        nguoi_tao_id: "ns-01",
      },
      error: null,
    });
    mocks.appendNhatKy.mockResolvedValue({ id: "nk-01" });
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

    expect(mocks.appendNhatKy).not.toHaveBeenCalled();
  });

  it("allows assignee to add note in DANG_LAM without updating fact row", async () => {
    mocks.taskMaybeSingle.mockResolvedValue({
      data: {
        id: "cv-01",
        nguoi_phu_trach_id: "ns-01",
        trang_thai: "DANG_LAM",
        is_active: true,
        phan_tram_hoan_thanh: 50,
        nguoi_tao_id: "ns-01",
      },
      error: null,
    });

    const result = await createHoatDong({
      id_cong_viec: "cv-01",
      loai_hoat_dong: "BAO_CAO_TIEN_DO",
      noi_dung: "Đã xong bước 1",
    });

    expect(result).toBeTruthy();
    expect(mocks.appendNhatKy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        phanTramHoanThanh: 50,
        noiDung: "Đã xong bước 1",
      }),
    );
  });
});
