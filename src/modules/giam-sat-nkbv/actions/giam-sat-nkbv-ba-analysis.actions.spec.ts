import { beforeEach, describe, expect, it, vi } from "vitest";

/** Máu-sau-cùng phía server: phiếu có sẵn nhận kết luận lần đầu cũng bị chặn như tạo mới. */
const mocks = vi.hoisted(() => ({
  validateBloodLast: vi.fn(),
  updates: [] as unknown[],
  caseRow: {} as Record<string, unknown>,
}));

function chain(table: string) {
  const list = table === "nkbv_fact_vi_sinh" ? [{ id: "vs1", ngay_lay_mau: "2026-11-01", loai_benh_pham: "Máu", tac_nhan: "E. coli", metadata: {} }] : [];
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "order", "limit"]) q[m] = () => q;
  q.update = (v: unknown) => { mocks.updates.push(v); return q; };
  q.maybeSingle = async () => ({ data: table === "v_nkbv_su_kien_full" ? mocks.caseRow : null, error: null });
  q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: list, error: null }).then(res);
  return q;
}

vi.mock("@/lib/supabase-server", () => ({ createAdminSupabaseClient: () => ({ from: chain, rpc: vi.fn() }) }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn() }));
vi.mock("@/lib/master-data/validation", () => ({ normalizeAndValidateDmKhoaPhong: vi.fn() }));
vi.mock("./giam-sat-nkbv-ba-ngay.actions", () => ({ syncNkbvPhieuFromBaNgay: vi.fn() }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn().mockResolvedValue(null),
  isNkbvBenhAnInScope: vi.fn().mockResolvedValue(true),
  NKBV_OUT_OF_SCOPE_ERROR: "ngoài phạm vi",
}));
vi.mock("../lib/nkbv-vi-sinh-analysis-status", () => ({
  bareViSinhIdFromMilestoneId: () => "vs1",
  resolveViSinhAnalysisStatus: () => "CHUA_PHAN_TICH",
}));
vi.mock("../lib/nkbv-chrono-precedence", () => ({ validateBloodLast: mocks.validateBloodLast }));
vi.mock("../lib/nkbv-blood-primary-guard", () => ({ bloodPrimaryBlockedByPriorEvents: () => null }));
vi.mock("../lib/nkbv-analysis-session-to-verification", () => ({
  mapAnalysisSessionToVerificationSeed: () => ({
    verification_data: { seeded_from_ba_analysis: true },
    clinical_notes_patch: {},
    analyzedViSinhIds: [],
  }),
}));

import { ensureNkbvBaAnalysisCase } from "./giam-sat-nkbv-ba-analysis.actions";

const seed = { panel: "L1", draft: {}, indexKind: "XN" } as never;
const base = {
  ma_benh_an: "BA1",
  milestone_id: "XN_vs1",
  milestone_date: "2026-11-01",
  gate: "BSI" as const,
  existing_case_id: "c1",
  analysisSeed: seed,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.caseRow = { id: "c1", trang_thai_ma: "DANG_GHI_NHAN", verification_data: {}, clinical_notes: {} };
});

describe("ensureNkbvBaAnalysisCase · máu-sau-cùng với existing_case_id", () => {
  it("phiếu có sẵn chưa seed + còn mẫu chưa PT → chặn, không ghi kết luận", async () => {
    mocks.validateBloodLast.mockReturnValue({ allowed: false, message: "Theo CDC/NHSN: cấy máu phân tích sau cùng" });
    const res = await ensureNkbvBaAnalysisCase(base);
    expect(res).toEqual({ success: false, error: "Theo CDC/NHSN: cấy máu phân tích sau cùng" });
    expect(mocks.updates).toEqual([]);
  });

  it("phiếu có sẵn chưa seed + hợp lệ → seed bình thường", async () => {
    mocks.validateBloodLast.mockReturnValue({ allowed: true });
    const res = await ensureNkbvBaAnalysisCase(base);
    expect(res.success).toBe(true);
    expect(mocks.updates.length).toBeGreaterThan(0);
  });

  it("phiếu đã seed trước đó → mở lại không kiểm lại luật", async () => {
    mocks.caseRow = { ...mocks.caseRow, verification_data: { seeded_from_ba_analysis: true } };
    const res = await ensureNkbvBaAnalysisCase(base);
    expect(res.success).toBe(true);
    expect(mocks.validateBloodLast).not.toHaveBeenCalled();
  });
});
