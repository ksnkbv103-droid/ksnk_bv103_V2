import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAnyPermission: vi.fn(),
  getActorNhanSuId: vi.fn(),
  revalidateCssdInventorySurfaces: vi.fn(),
  releaseSetReconcileDraftAction: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyAnyPermission: mocks.verifyAnyPermission,
}));

vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: mocks.getActorNhanSuId,
}));

vi.mock("./cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  revalidateCssdInventorySurfaces: mocks.revalidateCssdInventorySurfaces,
}));

vi.mock("@/modules/cssd-su-co/actions/set-reconcile-draft.actions", () => ({
  releaseSetReconcileDraftAction: mocks.releaseSetReconcileDraftAction,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

import {
  applyInstrumentTransferAction,
  receiveNewInstrumentsAction,
  decommissionInstrumentsAction,
  fetchInstrumentLifecycleHistoryAction,
} from "./cssd-lifecycle.actions";

describe("cssd-lifecycle.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAnyPermission.mockResolvedValue(undefined);
    mocks.getActorNhanSuId.mockResolvedValue("ns-test-01");
  });

  describe("quyền ghi", () => {
    it("từ chối khi thiếu quyền ghi và không chạm DB", async () => {
      mocks.verifyAnyPermission.mockRejectedValueOnce(new Error("Cần ít nhất một quyền phù hợp"));
      const res = await receiveNewInstrumentsAction({ loaiDungCuId: "l1", soLuong: 1 });
      expect(res.success).toBe(false);
      expect(mocks.rpc).not.toHaveBeenCalled();
      const arg = mocks.verifyAnyPermission.mock.calls[0][0] as { moduleKey: string; action: string }[];
      expect(arg.some((c) => c.action === "view")).toBe(false);
    });
  });

  describe("applyInstrumentTransferAction (BIZ-03)", () => {
    it("rejects empty lines", async () => {
      const res = await applyInstrumentTransferAction({
        boDungCuId: "bo-01",
        maBo: "B01.SET.01",
        tenBo: "Bộ đại phẫu",
        lines: [],
      });
      expect(res.success).toBe(false);
      expect((res as { error: string }).error).toMatch(/Chưa có danh sách/);
    });

    it("applies transfer via RPC with p_su_co_id = null (isolated from incidents)", async () => {
      mocks.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });
      mocks.releaseSetReconcileDraftAction.mockResolvedValue({ success: true });

      const res = await applyInstrumentTransferAction({
        boDungCuId: "bo-01",
        draftIncidentId: "draft-99",
        maBo: "B01.SET.01",
        tenBo: "Bộ đại phẫu",
        lines: [
          {
            chiTietId: "ct-1",
            loaiDungCuId: "loai-1",
            tenDungCuLe: "Kéo Mayo thẳng",
            soLuongChuan: 2,
            soLuongThucTe: 2,
            soLuongDem: 3,
            kind: "BO_SUNG",
          },
        ],
        note: "Bổ sung kéo từ kho dự phòng",
      });

      expect(res.success).toBe(true);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "rpc_cssd_apply_instrument_lines",
        expect.objectContaining({
          p_su_co_id: null,
          p_bo_dung_cu_id: "bo-01",
        }),
      );
      expect(mocks.releaseSetReconcileDraftAction).toHaveBeenCalledWith("draft-99");
      expect(mocks.revalidateCssdInventorySurfaces).toHaveBeenCalled();
    });
  });

  describe("receiveNewInstrumentsAction (BIZ-04.1)", () => {
    it("validates input parameters", async () => {
      const res1 = await receiveNewInstrumentsAction({
        loaiDungCuId: "",
        soLuong: 5,
      });
      expect(res1.success).toBe(false);

      const res2 = await receiveNewInstrumentsAction({
        loaiDungCuId: "loai-1",
        soLuong: 0,
      });
      expect(res2.success).toBe(false);
    });

    it("records new inventory reception with NHAP_KHO", async () => {
      mocks.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const res = await receiveNewInstrumentsAction({
        loaiDungCuId: "loai-1",
        soLuong: 10,
        nguonCap: "Phòng Trang bị BV103",
        soChungTu: "PNK-001",
        ghiChu: "Lô sản xuất 2026",
      });

      expect(res.success).toBe(true);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "rpc_cssd_apply_instrument_ledger",
        expect.objectContaining({
          p_su_co_id: null,
          p_loai_dung_cu_id: "loai-1",
          p_bo_dung_cu_id: null,
          p_loai_giao_dich: "NHAP_KHO",
          p_so_luong_thay_doi: 10,
          p_ghi_chu: expect.stringContaining("PNK-001"),
        }),
      );
      expect(mocks.revalidateCssdInventorySurfaces).toHaveBeenCalled();
    });
  });

  describe("decommissionInstrumentsAction (BIZ-04.2)", () => {
    it("decommissions from kho le by reducing reserve and inserting ledger", async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === "cssd_dm_loai_dung_cu") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { so_luong_kho_du_phong: 5 },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        if (table === "cssd_fact_kho_giao_dich") {
          return {
            insert: async () => ({ error: null }),
          };
        }
        return {};
      });

      const res = await decommissionInstrumentsAction({
        sourceKind: "KHO_LE",
        loaiDungCuId: "loai-1",
        soLuong: 2,
        lyDoLoaiBien: "HAO_MON_CO_HOC",
        soBienBan: "BBTL-01",
      });

      expect(res.success).toBe(true);
      expect(mocks.revalidateCssdInventorySurfaces).toHaveBeenCalled();
    });

    it("rejects when kho le has insufficient reserve", async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === "cssd_dm_loai_dung_cu") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { so_luong_kho_du_phong: 1 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await decommissionInstrumentsAction({
        sourceKind: "KHO_LE",
        loaiDungCuId: "loai-1",
        soLuong: 5,
        lyDoLoaiBien: "HAO_MON_CO_HOC",
      });

      expect(res.success).toBe(false);
      expect((res as { error: string }).error).toMatch(/không đủ số lượng/);
    });

    it("decommissions from a set via RPC without incident", async () => {
      mocks.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const res = await decommissionInstrumentsAction({
        sourceKind: "BO_DUNG_CU",
        loaiDungCuId: "loai-1",
        boDungCuId: "bo-01",
        soLuong: 1,
        lyDoLoaiBien: "RI_SET_MOI_KIM_LOAI",
        soBienBan: "BBTL-02",
      });

      expect(res.success).toBe(true);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "rpc_cssd_apply_instrument_ledger",
        expect.objectContaining({
          p_su_co_id: null,
          p_loai_dung_cu_id: "loai-1",
          p_bo_dung_cu_id: "bo-01",
          p_loai_giao_dich: "BAO_HONG",
          p_so_luong_thay_doi: -1,
          p_ghi_chu: expect.stringContaining("LOẠI BIÊN HAO MÒN"),
        }),
      );
    });
  });

  describe("fetchInstrumentLifecycleHistoryAction", () => {
    it("categorizes transactions with appropriate labels and variants", async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === "cssd_fact_kho_giao_dich") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: "tx-1",
                        loai_dung_cu_id: "l-1",
                        bo_dung_cu_id: null,
                        loai_giao_dich: "NHAP_KHO",
                        so_luong_thay_doi: 10,
                        ghi_chu: "[NHẬP MỚI VẬT TƯ/TRANG BỊ]",
                        created_at: "2026-11-05T00:00:00Z",
                      },
                      {
                        id: "tx-2",
                        loai_dung_cu_id: "l-1",
                        bo_dung_cu_id: "b-1",
                        loai_giao_dich: "BO_SUNG",
                        so_luong_thay_doi: 2,
                        ghi_chu: "Bổ sung",
                        created_at: "2026-11-05T01:00:00Z",
                      },
                      {
                        id: "tx-3",
                        loai_dung_cu_id: "l-1",
                        bo_dung_cu_id: null,
                        loai_giao_dich: "BAO_HONG",
                        so_luong_thay_doi: -1,
                        ghi_chu: "[LOẠI BIÊN HAO MÒN - KHO LẺ] Cùn mòn",
                        created_at: "2026-11-05T02:00:00Z",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cssd_dm_bo_dung_cu") {
          return {
            select: () => ({
              in: async () => ({
                data: [{ id: "b-1", ma_bo: "B01.SET.01", ten_bo: "Bộ đại phẫu" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "cssd_dm_loai_dung_cu") {
          return {
            select: () => ({
              in: async () => ({
                data: [{ id: "l-1", ma_loai: "DC-01", ten_loai: "Kéo Mayo" }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const res = await fetchInstrumentLifecycleHistoryAction();
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toHaveLength(3);
        expect(res.data[0].badge_label).toBe("Nhập mới từ VT/TB");
        expect(res.data[0].badge_variant).toBe("emerald");
        expect(res.data[1].badge_label).toBe("Bổ sung vào bộ");
        expect(res.data[1].badge_variant).toBe("indigo");
        expect(res.data[2].badge_label).toBe("Loại biên hao mòn");
        expect(res.data[2].badge_variant).toBe("slate");
      }
    });
  });
});
