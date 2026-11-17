import { beforeEach, describe, expect, it, vi } from "vitest";

/** NKBV-008: thay bộ phiên phân tích qua một RPC nguyên tử, không còn update/insert rời. */
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn().mockResolvedValue(null),
  isNkbvBenhAnInScope: vi.fn().mockResolvedValue(true),
  NKBV_OUT_OF_SCOPE_ERROR: "ngoài phạm vi",
}));

import { replaceNkbvBaPhanTichSessions } from "./giam-sat-nkbv-ba-phan-tich.actions";
import { isNkbvBenhAnInScope } from "../lib/nkbv-khoa-scope.server";
import type { BaAnalysisSession } from "../lib/nkbv-ba-analysis-session";

const session = {
  id: "s1",
  panel: "L1",
  index: { d: "2026-11-01" },
  indexLabel: "01/11",
  draft: {},
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
} as unknown as BaAnalysisSession;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { deactivated: 1, inserted: 1 }, error: null });
});

describe("replaceNkbvBaPhanTichSessions", () => {
  it("gọi đúng một RPC với mã BA, chế độ và các dòng; không ghi bảng trực tiếp", async () => {
    const res = await replaceNkbvBaPhanTichSessions({ ma_benh_an: "BA1", mode: "CDC", sessions: [session] });
    expect(res.success).toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe("rpc_nkbv_replace_ba_phan_tich_sessions");
    expect(args.p_ma_benh_an).toBe("BA1");
    expect(args.p_analysis_mode).toBe("CDC");
    expect(args.p_rows).toEqual([
      expect.objectContaining({
        session_id: "s1",
        panel: "L1",
        index_label: "01/11",
        created_at: "2026-11-01T00:00:00.000Z",
        updated_at: "2026-11-02T00:00:00.000Z",
      }),
    ]);
  });

  it("danh sách rỗng → vẫn gọi RPC với mảng rỗng (chỉ tắt bộ cũ)", async () => {
    const res = await replaceNkbvBaPhanTichSessions({ ma_benh_an: "BA1", mode: "CDC", sessions: [] });
    expect(res.success).toBe(true);
    expect(mocks.rpc.mock.calls[0][1].p_rows).toEqual([]);
  });

  it("bệnh án ngoài phạm vi khoa → từ chối, không gọi RPC", async () => {
    vi.mocked(isNkbvBenhAnInScope).mockResolvedValueOnce(false);
    const res = await replaceNkbvBaPhanTichSessions({ ma_benh_an: "BA-KHOA-KHAC", mode: "CDC", sessions: [session] });
    expect(res).toEqual({ success: false, error: "ngoài phạm vi" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("RPC lỗi → báo thất bại nguyên văn", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await replaceNkbvBaPhanTichSessions({ ma_benh_an: "BA1", mode: "CDC", sessions: [session] });
    expect(res).toEqual({ success: false, error: "boom" });
  });
});
