import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom, auth: { getUser: vi.fn() } };

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

vi.mock("@/lib/cssd-server-gates", () => ({
  verifyCssdBatchEdit: vi.fn().mockResolvedValue(undefined),
  verifyCssdBatchView: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../helpers/me-tiet-khuan-batch-trace", () => ({
  getBatchAddRejectionReason: vi.fn(),
}));

vi.mock("../actions/cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => String(e),
  mapFkError: (m: string) => m,
  revalidateCssdBatchSurfaces: vi.fn(),
}));

import { createCssdSterilizationBatch } from "../actions/cssd-batch.actions";

function chain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

describe("createCssdSterilizationBatch (Phase 5.4 T3)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("blocks batch when machine REPAIRING", async () => {
    const machineId = "11111111-1111-4111-8111-111111111111";
    const napId = "22222222-2222-4222-8222-222222222222";
    mockFrom.mockImplementation((table: string) => {
      if (table === "mdm_nhan_su") return chain({ id: napId, ho_ten: "NV Test" });
      return chain({ id: machineId, ten_thiet_bi: "Lò A", trang_thai: "REPAIRING" });
    });

    const r = await createCssdSterilizationBatch(machineId, napId, "HN_134");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/bảo trì/i);
  });
});
