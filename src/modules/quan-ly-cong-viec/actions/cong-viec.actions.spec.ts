import { beforeEach, describe, expect, it, vi } from "vitest";
import { tuChoiHoanThanhCongViec, updateCongViec } from "./cong-viec.actions";
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
    ensureQlcvKsnkAccess: vi.fn(),
    appendNhatKy: vi.fn(),
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

vi.mock("../lib/qlcv-action-guard", () => ({
  ensureQlcvKsnkAccess: mocks.ensureQlcvKsnkAccess,
}));

vi.mock("../lib/qlcv-nhat-ky", () => ({
  appendQlcvNhatKy: mocks.appendNhatKy,
}));

const transitionMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  approve: vi.fn(),
}));

vi.mock("../lib/qlcv-transition-rpc", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/qlcv-transition-rpc")>()),
  invokeQlcvTransition: transitionMocks.invoke,
}));

vi.mock("../lib/qlcv-rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/qlcv-rbac")>()),
  verifyQlcvApproveCapability: transitionMocks.approve,
}));

const NS_NEW = "66666666-6666-4666-8666-666666666666";

describe("updateCongViec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearQlcvLookupIdCacheForTests();
    mocks.setUpdatePayload(null);
    mocks.hasBypass.mockResolvedValue(true);
    mocks.ensureQlcvKsnkAccess.mockImplementation(async () => ({
      supabase: { from: mocks.from },
      ksnkKhoaId: "ksnk-khoa-id",
    }));
    mocks.metaMaybeSingle.mockResolvedValue({ data: { id: "cv-01" }, error: null });
    mocks.updateSingle.mockResolvedValue({ data: { id: "cv-01" }, error: null });
    mocks.appendNhatKy.mockResolvedValue({ id: "nk-01" });
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
            eq: () => ({ not: () => ({ select: () => ({ single: mocks.updateSingle }) }) }),
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
                  tieu_de: "Việc cũ",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-1",
                  han_hoan_thanh: "2099-12-31",
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
              eq: () => ({ not: () => ({ select: () => ({ single: mocks.updateSingle }) }) }),
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
      }),
    ).rejects.toThrow(/Không.*trạng thái/i);
  });

  it("blocks admin from updating status through updateCongViec (QLCV-06)", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  tieu_de: "Việc",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-1",
                  han_hoan_thanh: "2099-12-31",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
    await expect(
      updateCongViec("cv-01", { trang_thai: "HOAN_THANH" }),
    ).rejects.toThrow(/Không cập nhật trạng thái qua form sửa/i);
  });

  it("records gia_han activity when han_hoan_thanh changes", async () => {
    mocks.hasBypass.mockResolvedValue(true);

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
                  tieu_de: "Việc hạn",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-1",
                  han_hoan_thanh: pastDate,
                  loai_cong_viec: "DOT_XUAT",
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
              eq: () => ({ not: () => ({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }) }) }) }),
            };
          },
        };
      }
      return {};
    });

    const result = await updateCongViec("cv-01", {
      han_hoan_thanh: futureDate,
    });

    expect(result.success).toBe(true);
    expect(mocks.appendNhatKy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loaiHoatDong: "GIA_HAN",
        noiDung: expect.stringContaining(`Thay đổi hạn hoàn thành từ ${pastDate} sang ${futureDate}`),
      }),
    );
  });

  it("records phan_cong activity when nguoi_phu_trach_id changes", async () => {
    mocks.hasBypass.mockResolvedValue(true);

    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-01",
                  tieu_de: "Việc giao",
                  trang_thai: "MOI",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-old",
                  nguoi_phu_trach_ten: "Nguyễn Văn Cũ",
                  han_hoan_thanh: "2099-12-31",
                  loai_cong_viec: "DOT_XUAT",
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
              eq: () => ({ not: () => ({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: "cv-01" }, error: null }) }) }) }),
            };
          },
        };
      }
      if (table === "mdm_nhan_su") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: NS_NEW, khoa_id: "ksnk-khoa-id", ho_ten: "Trần Thị Mới" },
                  error: null,
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ho_ten: "Trần Thị Mới" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await updateCongViec("cv-01", {
      nguoi_phu_trach_id: NS_NEW,
    });

    expect(result.success).toBe(true);
    expect(mocks.appendNhatKy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loaiHoatDong: "PHAN_CONG",
        noiDung: expect.stringContaining("Thay đổi người phụ trách từ Nguyễn Văn Cũ sang Trần Thị Mới"),
      }),
    );
    // Q-08: tự chuyển MOI → DANG_LAM phải có dấu vết trong nhật ký.
    expect(mocks.appendNhatKy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ loaiHoatDong: "CAP_NHAT", trangThai: "DANG_LAM" }),
    );
  });

  it("QLCV-007: phê duyệt đề xuất gửi 7 cột mở rộng trong patch RPC, không UPDATE riêng trước", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    mocks.getActorNhanSuId.mockResolvedValue("ns-actor");
    transitionMocks.approve.mockResolvedValue(undefined);
    transitionMocks.invoke.mockResolvedValue({ id: "cv-dx", trang_thai: "DANG_LAM" });
    const factUpdates: unknown[] = [];
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-dx",
                  tieu_de: "Đề xuất",
                  trang_thai: "MOI",
                  is_active: false,
                  nguoi_phu_trach_id: NS_NEW,
                  han_hoan_thanh: "2099-12-31",
                  loai_cong_viec: "DOT_XUAT",
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
          update: (payload: unknown) => {
            factUpdates.push(payload);
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === "mdm_nhan_su") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: NS_NEW, khoa_id: "ksnk-khoa-id", ho_ten: "Trần Thị Mới" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await updateCongViec("cv-dx", {
      vi_tri_thuc_hien: "  Kho tiệt khuẩn  ",
      nhom_chuyen_mon_id: null,
      dia_diem_khoa_ids: [],
      nguoi_phoi_hop_ids: [],
      nguoi_theo_doi_ids: [],
    } as never);

    expect(result).toMatchObject({ success: true, activated: true });
    expect(factUpdates).toHaveLength(0);
    expect(transitionMocks.invoke).toHaveBeenCalledTimes(1);
    const call = transitionMocks.invoke.mock.calls[0][1] as { action: string; patch: Record<string, unknown> };
    expect(call.action).toBe("PHE_DUYET_DEXUAT");
    expect(call.patch).toMatchObject({
      vi_tri_thuc_hien: "Kho tiệt khuẩn",
      nhom_chuyen_mon_id: null,
      dia_diem_khoa_ids: [],
      dia_diem_khoa_id: null,
      nguoi_phoi_hop_ids: [],
      nguoi_theo_doi_ids: [],
    });
  });

  it("QLCV-007: RPC phê duyệt lỗi → không có ghi riêng nào lên bảng việc", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    mocks.getActorNhanSuId.mockResolvedValue("ns-actor");
    transitionMocks.approve.mockResolvedValue(undefined);
    transitionMocks.invoke.mockRejectedValue(new Error("Không phải đề xuất chờ duyệt"));
    const factUpdates: unknown[] = [];
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-dx", tieu_de: "Đề xuất", trang_thai: "MOI", is_active: false,
                  nguoi_phu_trach_id: NS_NEW, han_hoan_thanh: "2099-12-31",
                  loai_cong_viec: "DOT_XUAT", phan_tram_hoan_thanh: 0,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "qlcv_fact_cong_viec") {
        return { update: (p: unknown) => (factUpdates.push(p), { eq: async () => ({ error: null }) }) };
      }
      if (table === "mdm_nhan_su") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: NS_NEW, khoa_id: "ksnk-khoa-id", ho_ten: "Trần Thị Mới" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(
      updateCongViec("cv-dx", { vi_tri_thuc_hien: "Kho", nguoi_theo_doi_ids: [] } as never),
    ).rejects.toThrow("Không phải đề xuất chờ duyệt");
    expect(factUpdates).toHaveLength(0);
  });

  it("blocks modifying a closed task (HOAN_THANH or DA_HUY)", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    mocks.from.mockImplementation((table: string) => {
      if (table === "v_qlcv_cong_viec_full") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cv-closed",
                  tieu_de: "Việc đã xong",
                  trang_thai: "HOAN_THANH",
                  is_active: true,
                  nguoi_phu_trach_id: "ns-1",
                  han_hoan_thanh: "2099-12-31",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(
      updateCongViec("cv-closed", { tieu_de: "Sửa lại tiêu đề sau khi đóng" }),
    ).rejects.toThrow(/Công việc đã đóng/i);
  });

  it("rejects empty reason in tuChoiHoanThanhCongViec", async () => {
    mocks.hasBypass.mockResolvedValue(true);
    await expect(tuChoiHoanThanhCongViec("cv-01", "   ")).rejects.toThrow(
      /Nhập lý do từ chối nghiệm thu/i,
    );
  });
});
