import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveGiamSatChung } from "./giam-sat-chung-write.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  getActorKsnkScope: vi.fn(),
  hasAdminBypass: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  hasRBACAdminSupervisionBypass: mocks.hasAdminBypass,
}));

vi.mock("@/lib/actor-ksnk-scope-server", () => ({
  getActorKsnkScope: mocks.getActorKsnkScope,
}));

vi.mock("@/lib/validations", () => ({
  gscSaveSessionSchema: {
    safeParse: () => ({ success: true, data: {} }),
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ from: mocks.from }),
}));

// Các phụ thuộc không liên quan tới nhánh sửa phiên: mock tối giản để tới được bước update.
vi.mock("@/lib/supervision-module-lock", () => ({ assertSupervisionNotLockedForDate: vi.fn() }));
vi.mock("../lib/revalidate-gsc-paths", () => ({ revalidateGscPaths: vi.fn() }));
vi.mock("@/lib/master-data/fk-normalize", () => ({
  normalizeHoSoNhanVienOptionalOrThrow: async (_s: unknown, id: string | null) => id ?? null,
}));
vi.mock("@/lib/master-data/validation", () => ({
  normalizeAndValidateDmKhoaPhong: async ({ idRaw }: { idRaw: string }) => idRaw,
  validateDanhMucIdByType: vi.fn(),
}));
vi.mock("@/lib/actor-auth-server", () => ({
  getActorAuthUserId: async () => "auth-1",
  getActorNhanSuId: async () => "ns-1",
}));
vi.mock("@/lib/supervision-policy", () => ({
  resolveSupervisorPolicy: async () => ({ derivedHinhThuc: "TRUC_TIEP" }),
}));
vi.mock("@/lib/khu-vuc-giam-sat-server", () => ({ assertKhuVucAllowedForKhoa: vi.fn() }));
vi.mock("../lib/resolve-loai-bang-kiem-persist", () => ({
  resolveBangKiemPersistFields: async () => ({
    bang_kiem_id: "bk-1",
    is_active: true,
    ap_dung_jsonb: null,
    loai_giam_sat: null,
    doi_tuong_giam_sat: "NHAN_VIEN",
  }),
}));
vi.mock("../lib/gsc-bang-kiem-snapshot", () => ({
  parseGscBangKiemSnapshot: () => null,
  loadLiveGscBangKiemSnapshot: async () => ({ bang_kiem_id: "bk-1" }),
  pickGscBangKiemSnapshotForSave: () => ({ bang_kiem_id: "bk-1" }),
  serializeGscBangKiemSnapshotForMetadata: () => ({}),
}));
vi.mock("../lib/gsc-score-display", () => ({
  gscCanSaveResults: () => true,
  isGscNhatKyCach: () => false,
}));
vi.mock("./giam-sat-chung-write-helpers", () => ({
  normalizeGscModeFields: () => ({ cach: null, hinh_id: null, cach_id: null }),
  resolveGscModeIds: async () => ({ hinh_thuc_id: null, cach_thuc_id: null }),
  validateGscModeFields: vi.fn(),
  parseNgayGiamSatOrNull: () => "2026-10-01",
  resolveScoringSummary: async () => ({
    tong_diem: 1,
    dat_tron_goi: true,
    du_lieu_nghi_van: false,
    cach_tinh_diem: "TY_LE",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("saveGiamSatChung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.getActorKsnkScope.mockResolvedValue({
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-01",
    });
  });

  it("rejects create when requested khoa is out of actor scope", async () => {
    const result = await saveGiamSatChung(
      {
        khoa_id: "khoa-02",
        khu_vuc_id: "kv-01",
        loai_bang_kiem: "GSC",
      },
      [{ criterionId: "c1", value: "DAT" }],
    );

    expect(result).toEqual({
      success: false,
      error: "Khoa được yêu cầu nằm ngoài phạm vi được phép.",
    });
    expect(mocks.verifyPermission).toHaveBeenCalledWith("GIAM_SAT_CHUNG", "create");
  });

  describe("sửa phiên có sẵn (existingSessionId)", () => {
    type Q = { table: string; op: string; filters: Array<[string, unknown[]]> };
    let queries: Q[];
    const SESSION_ID = "sess-1";

    function setup(existing: unknown, updateRows: unknown[]) {
      queries = [];
      mocks.hasAdminBypass.mockResolvedValue(true);
      mocks.from.mockImplementation((table: string) => {
        const q: Q = { table, op: "select", filters: [] };
        queries.push(q);
        const b: Record<string, unknown> = {};
        b.select = () => b;
        b.update = () => ((q.op = "update"), b);
        b.eq = (...a: unknown[]) => (q.filters.push(["eq", a]), b);
        b.maybeSingle = async () => ({ data: existing, error: null });
        b.then = (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: updateRows, error: null }).then(res);
        return b;
      });
    }

    const run = () =>
      saveGiamSatChung(
        { khoa_id: "khoa-01", khu_vuc_id: "kv-01", loai_bang_kiem: "GSC", vi_tri: "P1" } as never,
        [{ criterionId: "c1", value: "DAT" }],
        { existingSessionId: SESSION_ID },
      );

    it("phiên đã xóa (is_active=false): báo lỗi, không update, không làm sống lại", async () => {
      setup({ id: SESSION_ID, is_active: false, nguoi_giam_sat_id: "ns-1", metadata: {}, bang_kiem_id: "bk-1" }, []);
      const r = await run();
      expect(r).toEqual({ success: false, error: "Phiên đã bị vô hiệu, không sửa được." });
      expect(queries.some((q) => q.op === "update")).toBe(false);
    });

    it("phiên bị vô hiệu giữa đọc và ghi (update trả []): báo lỗi", async () => {
      setup({ id: SESSION_ID, is_active: true, nguoi_giam_sat_id: "ns-1", metadata: {}, bang_kiem_id: "bk-1" }, []);
      const r = await run();
      expect(r).toEqual({
        success: false,
        error: "Phiên đã bị vô hiệu hoặc không còn tồn tại, không sửa được.",
      });
      const up = queries.find((q) => q.op === "update");
      expect(up?.filters).toContainEqual(["eq", ["id", SESSION_ID]]);
      expect(up?.filters).toContainEqual(["eq", ["is_active", true]]);
    });

    it("phiên đang hoạt động: sửa thành công, update luôn kèm is_active=true", async () => {
      setup({ id: SESSION_ID, is_active: true, nguoi_giam_sat_id: "ns-1", metadata: {}, bang_kiem_id: "bk-1" }, [
        { id: SESSION_ID },
      ]);
      const r = await run();
      expect(r).toEqual({ success: true, sessionId: SESSION_ID });
      const up = queries.find((q) => q.op === "update");
      expect(up?.filters).toContainEqual(["eq", ["is_active", true]]);
    });

    it("phiên không còn tồn tại: báo lỗi", async () => {
      setup(null, []);
      expect(await run()).toEqual({ success: false, error: "Phiên không còn tồn tại." });
    });
  });
});
