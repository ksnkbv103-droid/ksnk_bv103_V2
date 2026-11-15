import { beforeEach, describe, expect, it, vi } from "vitest";
import { vstRepo } from "./vst.repo";

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  orMock: vi.fn(),
  orderMock: vi.fn(),
  rangeMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  inMock: vi.fn(),
  updateMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  callRpc: vi.fn(),
}));

vi.mock("@/lib/data-access", () => ({
  getDb: vi.fn(async () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = mocks.selectMock.mockReturnValue(chain);
    chain.eq = mocks.eqMock.mockReturnValue(chain);
    chain.or = mocks.orMock.mockReturnValue(chain);
    chain.order = mocks.orderMock.mockReturnValue(chain);
    chain.range = mocks.rangeMock.mockReturnValue(chain);
    chain.single = mocks.singleMock;
    chain.in = mocks.inMock.mockReturnValue(chain);
    chain.update = mocks.updateMock.mockReturnValue(chain);
    chain.maybeSingle = mocks.maybeSingleMock;
    return chain;
  }),
  callRpc: mocks.callRpc,
}));

vi.mock("../lib/vst-read-scope", () => ({
  applyVstHistoryReadScope: vi.fn((q) => q),
}));

vi.mock("../lib/vst-bo-sung-nguoi-benh", () => ({
  isVstSessionsMetadataColumnMissing: vi.fn((err: unknown) => {
    return Boolean(err && (err as { code?: string }).code === "42703");
  }),
}));

describe("vst.repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countVstSessions", () => {
    it("gọi select với exact count trên view v_gstt_giam_sat_vst_sessions_full", async () => {
      const scope = {
        roles: ["ADMIN"],
        actorNhanSuId: "ns-1",
        actorKhoaId: null,
        isAdmin: true,
        isNhanVienKsnk: false,
        isMangLuoiKsnk: false,
        isGuestStatsOnly: false,
      };
      await vstRepo.countVstSessions({ scope, searchFilter: "ten_khoa.ilike.%A%" });
      expect(mocks.selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
      expect(mocks.eqMock).toHaveBeenCalledWith("is_active", true);
      expect(mocks.orMock).toHaveBeenCalledWith("ten_khoa.ilike.%A%");
    });
  });

  describe("getVstSessionsPaginatedData", () => {
    it("truy vấn theo phạm vi phân trang và sắp xếp", async () => {
      const scope = {
        roles: ["ADMIN"],
        actorNhanSuId: "ns-1",
        actorKhoaId: null,
        isAdmin: true,
        isNhanVienKsnk: false,
        isMangLuoiKsnk: false,
        isGuestStatsOnly: false,
      };
      await vstRepo.getVstSessionsPaginatedData({
        scope,
        sortCol: "created_at",
        ascending: false,
        from: 0,
        to: 19,
      });
      expect(mocks.orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(mocks.rangeMock).toHaveBeenCalledWith(0, 19);
    });
  });

  describe("getVstSessionDetailView", () => {
    it("trả về kết quả WITH_NB khi thành công", async () => {
      mocks.singleMock.mockResolvedValueOnce({ data: { id: "s-1", ten_khoa: "Khoa A" }, error: null });
      const res = await vstRepo.getVstSessionDetailView("s-1");
      expect(res.data).toEqual({ id: "s-1", ten_khoa: "Khoa A" });
    });

    it("fallback sang view base khi thiếu cột metadata người bệnh", async () => {
      mocks.singleMock
        .mockResolvedValueOnce({ data: null, error: { code: "42703", message: "column not found" } })
        .mockResolvedValueOnce({ data: { id: "s-1", base: true }, error: null });

      const res = await vstRepo.getVstSessionDetailView("s-1");
      expect(res.data).toEqual({ id: "s-1", base: true });
    });
  });

  describe("softDeleteVstSessions", () => {
    it("update is_active = false và lưu thông tin xóa mềm", async () => {
      await vstRepo.softDeleteVstSessions({
        ids: ["s-1"],
        nowIso: "2026-11-09T00:00:00Z",
        deletedBy: "u-1",
        lyDo: "Nhập trùng dữ liệu",
      });
      expect(mocks.updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          deleted_at: "2026-11-09T00:00:00Z",
          deleted_by: "u-1",
          ly_do_xoa: "Nhập trùng dữ liệu",
        }),
      );
      expect(mocks.inMock).toHaveBeenCalledWith("id", ["s-1"]);
      expect(mocks.eqMock).toHaveBeenCalledWith("is_active", true);
    });
  });

  describe("RPC wrappers", () => {
    it("saveVstSessionViaRpc gọi callRpc với đúng tham số rpc_vst_save_session", async () => {
      mocks.callRpc.mockResolvedValueOnce({ data: { session_id: "s-123" }, error: null });
      const res = await vstRepo.saveVstSessionViaRpc({
        sessionId: "s-123",
        session: { khoa_id: "k-1" },
        observations: [],
      });
      expect(mocks.callRpc).toHaveBeenCalledWith(
        "rpc_vst_save_session",
        {
          p_session_id: "s-123",
          p_session: { khoa_id: "k-1" },
          p_observations: [],
        },
        "admin",
      );
      expect(res.data).toEqual({ session_id: "s-123" });
    });

    it("callRpcDashboardVstStrategicAnalytics gọi rpc_dashboard_vst_strategic_analytics_impl", async () => {
      mocks.callRpc.mockResolvedValueOnce({ data: { kpis: {} }, error: null });
      const args = { p_tu_ngay: "2026-01-01", p_den_ngay: "2026-01-31" };
      await vstRepo.callRpcDashboardVstStrategicAnalytics(args);
      expect(mocks.callRpc).toHaveBeenCalledWith(
        "rpc_dashboard_vst_strategic_analytics_impl",
        args,
        "admin",
      );
    });

    it("callRpcVstDeleteSession gọi rpc_vst_delete_session", async () => {
      mocks.callRpc.mockResolvedValueOnce({ data: true, error: null });
      await vstRepo.callRpcVstDeleteSession({ sessionId: "s-1", lyDo: "test" });
      expect(mocks.callRpc).toHaveBeenCalledWith(
        "rpc_vst_delete_session",
        { sessionId: "s-1", lyDo: "test" },
        "admin",
      );
    });
  });
});
