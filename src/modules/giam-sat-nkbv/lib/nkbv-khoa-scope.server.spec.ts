import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ ba: null as { khoa_dieu_tri_id: string | null } | null, days: [] as { khoa_id: string }[] }));

vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: db.ba, error: null });
      chain.limit = async () => ({ data: table === "nkbv_fact_ba_ngay_khoa" ? db.days : [], error: null });
      return chain;
    },
  }),
}));

import { isNkbvBenhAnInScope } from "./nkbv-khoa-scope.server";

const KHOA_A = { kind: "khoa", khoaId: "A" } as const;

beforeEach(() => {
  db.ba = null;
  db.days = [];
});

describe("isNkbvBenhAnInScope — ca có mã BA nhưng chưa có hồ sơ BA/lưới ngày", () => {
  it("BA chưa import: phiếu ghi nhận ở khoa mình thì trong phạm vi", async () => {
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-MOI", ["A"])).toBe(true);
  });

  it("BA chưa import: phiếu ghi nhận ở khoa khác vẫn bị chặn", async () => {
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-MOI", ["B"])).toBe(false);
  });

  it("BA chưa import, không truyền khoa dự phòng (Hub/đọc BA): vẫn chặn", async () => {
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-MOI")).toBe(false);
  });

  it("BA đã có hồ sơ ở khoa khác: khoa ghi nhận của phiếu không mở phạm vi", async () => {
    db.ba = { khoa_dieu_tri_id: "B" };
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-B", ["A"])).toBe(false);
  });

  it("Chưa có hồ sơ BA nhưng lưới ngày đã có ở khoa khác: không mở phạm vi", async () => {
    db.days = [{ khoa_id: "B" }];
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-LUOI-B", ["A"])).toBe(false);
  });

  it("BA đã có hồ sơ nhưng chưa có khoa điều trị, chưa có lưới ngày: phiếu khoa mình trong phạm vi", async () => {
    db.ba = { khoa_dieu_tri_id: null };
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-CHUA-KHOA", ["A"])).toBe(true);
  });

  it("BA chưa có khoa điều trị: phiếu khoa khác vẫn bị chặn", async () => {
    db.ba = { khoa_dieu_tri_id: null };
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-CHUA-KHOA", ["B"])).toBe(false);
  });

  it("BA chưa có khoa điều trị, không truyền khoa dự phòng (Hub/đọc BA): vẫn chặn", async () => {
    db.ba = { khoa_dieu_tri_id: null };
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-CHUA-KHOA")).toBe(false);
  });

  it("BA chưa có khoa điều trị nhưng lưới ngày đã có ở khoa khác: không mở phạm vi", async () => {
    db.ba = { khoa_dieu_tri_id: null };
    db.days = [{ khoa_id: "B" }];
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-CHUA-KHOA", ["A"])).toBe(false);
  });

  it("BA đã có hồ sơ, khoa điều trị là khoa mình: trong phạm vi", async () => {
    db.ba = { khoa_dieu_tri_id: "A" };
    expect(await isNkbvBenhAnInScope(KHOA_A, "BA-A")).toBe(true);
  });
});
