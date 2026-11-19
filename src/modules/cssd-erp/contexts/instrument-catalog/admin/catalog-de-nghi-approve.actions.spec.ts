import { beforeEach, describe, expect, it, vi } from "vitest";

let row: { id: string; status: string; reject_reason: string | null } | null;
const update = vi.fn();

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: async () => undefined }));
vi.mock("@/lib/server-permission", () => ({ getActorRoleNames: async () => ["ADMIN"] }));
vi.mock("@/lib/cssd-server-common", () => ({ revalidateCssdInventorySurfaces: () => undefined }));
vi.mock("@/lib/cache/revalidate-master-data-tags", () => ({ revalidateMasterDataRowCacheTag: () => undefined }));
vi.mock("@/lib/master-data/cssd-catalog-de-nghi-apply", () => ({ applyCatalogDeNghiOverwrite: vi.fn() }));
vi.mock("@/modules/cssd-erp/workflow/application/cssd-heat-split-apply", () => ({
  applyHeatSplitForLoaiChanges: vi.fn(),
}));
vi.mock("@/lib/master-data/cssd-catalog-approver-guard", () => ({
  checkCatalogApprover: vi.fn(),
  requireCssdCatalogApprove: async () => undefined,
  resolveCatalogApprover: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.in = () => b;
      b.maybeSingle = async () => ({ data: row, error: null });
      b.update = (...a: unknown[]) => {
        update(...a);
        return { eq: () => ({ in: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "x" }, error: null }) }) }) }) };
      };
      return b;
    },
  }),
}));

import { rejectCatalogDeNghiAction } from "./catalog-de-nghi-approve.actions";

const ID = "11111111-1111-4111-8111-111111111111";

describe("rejectCatalogDeNghiAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("từ chối phiếu APPLY_FAILED đã ghi danh mục", async () => {
    row = { id: ID, status: "APPLY_FAILED", reject_reason: "Đã ghi danh mục nhưng không chốt được phiếu: x" };
    const res = await rejectCatalogDeNghiAction(ID, "lý do");
    expect(res.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("vẫn cho từ chối APPLY_FAILED chưa ghi danh mục", async () => {
    row = { id: ID, status: "APPLY_FAILED", reject_reason: "Lỗi validate" };
    const res = await rejectCatalogDeNghiAction(ID, "lý do");
    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalled();
  });

  // QT-016 (PO 19/11 P10=A): từ chối đề nghị danh mục bắt buộc lý do ≥ 3 ký tự, kiểm cả phía server.
  describe("lý do từ chối bắt buộc ≥ 3 ký tự (QT-016)", () => {
    beforeEach(() => {
      row = { id: ID, status: "PENDING", reject_reason: null };
    });

    it.each([
      ["không truyền", undefined],
      ["null", null],
      ["chuỗi rỗng", ""],
      ["chỉ khoảng trắng", "     "],
      ["2 ký tự", "ab"],
      ["2 ký tự sau trim", "  ab  "],
    ])("%s → từ chối, không ghi DB", async (_ten, reason) => {
      const res = await rejectCatalogDeNghiAction(ID, reason as string | null | undefined);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toMatch(/3 ký tự/);
      expect(update).not.toHaveBeenCalled();
    });

    it("đủ 3 ký tự → ghi reject_reason đã trim", async () => {
      const res = await rejectCatalogDeNghiAction(ID, "  sai mã  ");
      expect(res.success).toBe(true);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "REJECTED", reject_reason: "sai mã" }));
    });
  });
});
