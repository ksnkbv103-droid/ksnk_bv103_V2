import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCongViec } from "./cong-viec.actions";
import { clearQlcvLookupIdCacheForTests } from "../lib/qlcv-persist-dm-fields";

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
    clearQlcvLookupIdCacheForTests();
    mocks.setUpdatePayload(null);
    mocks.hasBypass.mockResolvedValue(true);
    mocks.metaMaybeSingle.mockResolvedValue({ data: { id: "cv-01" }, error: null });
    mocks.updateSingle.mockResolvedValue({ data: { id: "cv-01" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== "qlcv_fact_cong_viec") return {};
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
    mocks.hasBypass.mockResolvedValue(true);
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: null,
                  han_hoan_thanh: null,
                  phan_tram_hoan_thanh: 0,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }),
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
      }
      return {};
    });

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

  it("blocks normal user from updating status directly through updateCongViec", async () => {
    mocks.hasBypass.mockResolvedValue(false); // Không phải Admin
    mocks.getActorNhanSuId.mockResolvedValue("actor-1");
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: null,
                  nguoi_tao_id: "actor-1",
                  khoa_thuc_hien_id: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "mdm_nhan_su") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { khoa_id: null }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(
      updateCongViec("cv-01", {
        trang_thai: "HOAN_THANH",
      })
    ).rejects.toThrow("Không được phép cập nhật trực tiếp trạng thái công việc qua biểu mẫu sửa.");
  });

  it("records gia_han activity when han_hoan_thanh changes", async () => {
    mocks.hasBypass.mockResolvedValue(true); // Cho phép sửa thoải mái
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0];

    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  trang_thai: "MOI",
                  is_active: true,
                  han_hoan_thanh: pastDate,
                  phan_tram_hoan_thanh: 20,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            mocks.setUpdatePayload(payload);
            return {
              eq: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }),
                }),
              }),
            };
          },
        };
      }
      if (table === "qlcv_fact_cong_viec_hoat_dong") {
        return {
          insert: insertMock,
        };
      }
      return {};
    });

    const result = await updateCongViec("cv-01", {
      han_hoan_thanh: futureDate,
    });

    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      loai_hoat_dong: "GIA_HAN",
      noi_dung: expect.stringContaining(`Thay đổi hạn hoàn thành từ ${pastDate} sang ${futureDate}`),
    }));
  });

  it("records phan_cong activity when nguoi_phu_trach_id changes", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-old",
                  nguoi_phu_trach_ten: "Nguyễn Văn Cũ",
                  phan_tram_hoan_thanh: 0,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            mocks.setUpdatePayload(payload);
            return {
              eq: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }),
                }),
              }),
            };
          },
        };
      }
      if (table === "mdm_nhan_su") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ho_ten: "Trần Thị Mới" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "qlcv_dm_trang_thai_cong_viec" || table === "qlcv_dm_loai_cong_viec") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "tt-dang-lam" }, error: null }),
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec_hoat_dong") {
        return {
          insert: insertMock,
        };
      }
      return {};
    });

    const result = await updateCongViec("cv-01", {
      nguoi_phu_trach_id: "ns-new",
    });

    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      loai_hoat_dong: "PHAN_CONG",
      noi_dung: expect.stringContaining("Thay đổi người phụ trách từ Nguyễn Văn Cũ sang Trần Thị Mới"),
    }));
  });
});
