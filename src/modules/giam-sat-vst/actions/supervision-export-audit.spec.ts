import { beforeEach, describe, expect, it, vi } from "vitest";

// VST-020: xuất dữ liệu thô VST/GSC phải để lại nhật ký (đặc tả M01 T1.32: xuất «có nhật ký»).
const m = vi.hoisted(() => ({
  logAdminAction: vi.fn(),
  vstSessions: [{ id: "s1" }, { id: "s2" }] as Array<Record<string, unknown>>,
  vstFacts: [
    { id: "f1", session_id: "s1" },
    { id: "f2", session_id: "s1" },
    { id: "f3", session_id: "s2" },
  ] as Array<Record<string, unknown>>,
  gscSessions: [{ id: "g1" }, { id: "g2" }] as Array<Record<string, unknown>>,
  currentSessions: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: m.logAdminAction }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({ in: async () => ({ data: [], error: null }) }),
    }),
  }),
}));
vi.mock("@/lib/fetch-all-range", () => ({
  fetchAllRangeRows: vi.fn(async () => m.currentSessions),
  fetchAllByIdChunks: vi.fn(async () => m.vstFacts),
}));
vi.mock("../lib/vst-read-scope", () => ({
  assertVstHistoryAccess: () => ({ ok: true }),
  applyVstHistoryReadScope: (q: unknown) => q,
}));
vi.mock("@/modules/giam-sat-chung/lib/gsc-read-scope", () => ({
  assertGscHistoryAccess: () => ({ ok: true }),
  applyGscHistoryReadScope: (q: unknown) => q,
  applyGscLoaiFilter: (q: unknown) => q,
}));

import { exportVstOpportunitiesRaw } from "./vst-export.actions";
import { exportGscSessionsRaw } from "@/modules/giam-sat-chung/actions/gsc-export.actions";

describe("VST-020: xuất dữ liệu thô ghi nhật ký", () => {
  beforeEach(() => {
    m.logAdminAction.mockClear();
  });

  it("VST: xuất thành công ghi nhật ký kèm kỳ và số dòng", async () => {
    m.currentSessions = m.vstSessions;
    const res = await exportVstOpportunitiesRaw({ tu_ngay: "2026-11-01", den_ngay: "2026-11-15" });
    expect(res.success).toBe(true);
    expect(m.logAdminAction).toHaveBeenCalledTimes(1);
    expect(m.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VST_EXPORT_RAW",
        after: expect.objectContaining({ tu_ngay: "2026-11-01", den_ngay: "2026-11-15", so_dong: 3 }),
      }),
    );
  });

  it("VST: kỳ rỗng vẫn ghi nhật ký (so_dong = 0)", async () => {
    m.currentSessions = [];
    const res = await exportVstOpportunitiesRaw({ tu_ngay: "2026-11-01", den_ngay: "2026-11-15" });
    expect(res).toEqual({ success: true, rows: [] });
    expect(m.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VST_EXPORT_RAW", after: expect.objectContaining({ so_dong: 0 }) }),
    );
  });

  it("VST: đầu vào sai không xuất nên không ghi nhật ký", async () => {
    const res = await exportVstOpportunitiesRaw({ tu_ngay: "2026-11-15", den_ngay: "2026-11-01" });
    expect(res.success).toBe(false);
    expect(m.logAdminAction).not.toHaveBeenCalled();
  });

  it("GSC: xuất thành công ghi nhật ký kèm kỳ, bộ lọc và số dòng", async () => {
    m.currentSessions = m.gscSessions;
    const res = await exportGscSessionsRaw({ tu_ngay: "2026-11-01", den_ngay: "2026-11-15", maBk: "BK01" });
    expect(res.success).toBe(true);
    expect(m.logAdminAction).toHaveBeenCalledTimes(1);
    expect(m.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "GSC_EXPORT_RAW",
        after: expect.objectContaining({
          tu_ngay: "2026-11-01",
          den_ngay: "2026-11-15",
          ma_bang_kiem: "BK01",
          so_dong: 2,
        }),
      }),
    );
  });

  it("GSC: đầu vào sai không xuất nên không ghi nhật ký", async () => {
    const res = await exportGscSessionsRaw({ tu_ngay: "x", den_ngay: "2026-11-01" });
    expect(res.success).toBe(false);
    expect(m.logAdminAction).not.toHaveBeenCalled();
  });
});
