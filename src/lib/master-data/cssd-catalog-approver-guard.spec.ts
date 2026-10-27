import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseUserClient: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ getActorRoleNames: vi.fn() }));

import {
  APPROVER_UNMAPPED,
  SELF_APPROVAL_FORBIDDEN,
  checkCatalogApprover,
} from "./cssd-catalog-approver-guard";

describe("KD-1 C3/TB7 — chặn tự duyệt", () => {
  it("người duyệt trùng người đề nghị (nhân sự) → chặn nếu không phải ADMIN", () => {
    const r = checkCatalogApprover({ authUserId: "u1", nhanSuId: "ns1", isAdmin: false }, { nhanSuId: "ns1" });
    expect(r).toEqual({ ok: false, error: SELF_APPROVAL_FORBIDDEN });
  });

  it("ADMIN tự duyệt phiếu danh mục (có cờ) → cho, ghi người duyệt", () => {
    const r = checkCatalogApprover(
      { authUserId: "u1", nhanSuId: "ns1", isAdmin: true },
      { nhanSuId: "ns1" },
      { adminMaySelfApprove: true },
    );
    expect(r).toEqual({ ok: true, approvedById: "ns1" });
  });

  it("ADMIN tự duyệt khi không có cờ (rà soát bộ) → vẫn chặn, khớp RPC", () => {
    const r = checkCatalogApprover({ authUserId: "u1", nhanSuId: "ns1", isAdmin: true }, { nhanSuId: "ns1" });
    expect(r).toEqual({ ok: false, error: SELF_APPROVAL_FORBIDDEN });
  });

  it("trùng tài khoản báo phiếu → chặn nếu không phải ADMIN", () => {
    const r = checkCatalogApprover({ authUserId: "u1", nhanSuId: "ns2", isAdmin: false }, { authUserId: "u1" });
    expect(r.ok).toBe(false);
  });

  it("người khác → cho duyệt, ghi người duyệt", () => {
    expect(checkCatalogApprover({ authUserId: "u2", nhanSuId: "ns2", isAdmin: false }, { nhanSuId: "ns1" })).toEqual({
      ok: true,
      approvedById: "ns2",
    });
  });

  it("không map được nhân sự: vai trò thường → từ chối; ADMIN break-glass → cho, người duyệt trống", () => {
    expect(checkCatalogApprover({ authUserId: "u3", nhanSuId: null, isAdmin: false }, { nhanSuId: "ns1" })).toEqual({
      ok: false,
      error: APPROVER_UNMAPPED,
    });
    expect(checkCatalogApprover({ authUserId: "u3", nhanSuId: null, isAdmin: true }, { nhanSuId: "ns1" })).toEqual({
      ok: true,
      approvedById: null,
    });
  });
});
