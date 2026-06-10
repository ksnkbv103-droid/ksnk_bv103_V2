import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom, auth: { getUser: vi.fn() } };

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

vi.mock("@/lib/cssd-server-gates", () => ({
  verifyCssdBatchEdit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../helpers/me-tiet-khuan-batch-trace", () => ({
  logQuyTrinhVaoMeTietKhuan: vi.fn(),
  getBatchAddRejectionReason: vi.fn(),
}));

vi.mock("../actions/cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => String(e),
  mapFkError: (m: string) => m,
  revalidateCssdBatchSurfaces: vi.fn(),
}));

import { createCssdSterilizationBatch } from "../actions/cssd-batch.actions";

describe("createCssdSterilizationBatch (Phase 5.4 T3)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("blocks batch when machine REPAIRING", async () => {
    const machineId = "11111111-1111-4111-8111-111111111111";
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: machineId, ten_thiet_bi: "Lò A", trang_thai: "REPAIRING" },
        error: null,
      }),
    });

    const r = await createCssdSterilizationBatch(machineId, "tester@bv103.vn");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/bảo trì/i);
  });
});
