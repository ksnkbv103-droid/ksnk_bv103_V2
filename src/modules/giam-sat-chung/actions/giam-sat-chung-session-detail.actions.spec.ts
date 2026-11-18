import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGiamSatChungSessionForViewBundle } from "./giam-sat-chung-session-detail.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  getActorKsnkScope: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.getActorKsnkScope }));
vi.mock("../lib/gsc-read-scope", () => ({
  assertGscHistoryAccess: () => ({ ok: true }),
  gscSessionVisibleToActor: () => true,
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ from: mocks.from }),
}));

/** Giả lập PostgREST khi 0 dòng: .single() trả lỗi PGRST116, .maybeSingle() trả data null. */
function khongCoDong() {
  const eq = () => ({
    single: async () => ({
      data: null,
      error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
    }),
    maybeSingle: async () => ({ data: null, error: null }),
  });
  return { select: () => ({ eq }) };
}

describe("getGiamSatChungSessionForViewBundle — VST-022", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.getActorKsnkScope.mockResolvedValue({});
    mocks.from.mockImplementation(() => khongCoDong());
  });

  it("phiên không tồn tại hoặc đã xóa mềm (view trả 0 dòng) → «Không tìm thấy phiên.», không lộ lỗi PostgREST", async () => {
    const res = await getGiamSatChungSessionForViewBundle("khong-co");
    expect(res).toEqual({ success: false, error: "Không tìm thấy phiên." });
  });
});
