import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRoles = vi.fn<() => Promise<string[]>>();
const mockAny = vi.fn<(alts: { moduleKey: string; action: string }[]) => Promise<void>>();

vi.mock("@/lib/server-permission", () => ({
  verifyAdminRole: vi.fn(async (message?: string) => {
    const roles = await mockRoles();
    if (!roles.includes("ADMIN")) throw new Error(message ?? "Chỉ ADMIN");
  }),
  verifyAnyPermission: (alts: { moduleKey: string; action: string }[]) => mockAny(alts),
}));

import { danhMucLookupPermissionCandidates, verifyDanhMucLookupPermission } from "./danh-muc-lookup-permission";
import { isAdminOnlyLookupWrite } from "./master-table-permission-map";

describe("danh-muc-lookup-permission — AR-8h", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAny.mockResolvedValue(undefined);
  });

  it("không còn fallback DANH_MUC", () => {
    expect(danhMucLookupPermissionCandidates("DANH_MUC_ORG", "view")).toEqual([
      { moduleKey: "DANH_MUC_ORG", action: "view" },
    ]);
    expect(danhMucLookupPermissionCandidates("GIAM_SAT_CHUNG", "view")).toEqual([
      { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
    ]);
  });

  it("lookup module nghiệp vụ: ghi chỉ ADMIN; xem không", () => {
    for (const owner of ["GIAM_SAT_CHUNG", "CSSD_WORKFLOW", "GIAM_SAT_NKBV"]) {
      for (const a of ["create", "edit", "delete", "import"]) expect(isAdminOnlyLookupWrite(owner, a)).toBe(true);
      expect(isAdminOnlyLookupWrite(owner, "view")).toBe(false);
    }
    expect(isAdminOnlyLookupWrite("DANH_MUC_ORG", "edit")).toBe(false);
  });

  it("có GIAM_SAT_CHUNG.create nhưng không ADMIN → không ghi được lookup GSC", async () => {
    mockRoles.mockResolvedValue(["NHAN_VIEN_KSNK"]);
    await expect(verifyDanhMucLookupPermission("GIAM_SAT_CHUNG", "create")).rejects.toThrow(/ADMIN/);
    expect(mockAny).not.toHaveBeenCalled();
  });

  it("ADMIN ghi được lookup CSSD", async () => {
    mockRoles.mockResolvedValue(["ADMIN"]);
    await expect(verifyDanhMucLookupPermission("CSSD_WORKFLOW", "edit")).resolves.toBeUndefined();
  });

  it("xem lookup GSC theo GIAM_SAT_CHUNG.view", async () => {
    await verifyDanhMucLookupPermission("GIAM_SAT_CHUNG", "view");
    expect(mockAny).toHaveBeenCalledWith([{ moduleKey: "GIAM_SAT_CHUNG", action: "view" }]);
    expect(mockRoles).not.toHaveBeenCalled();
  });
});
