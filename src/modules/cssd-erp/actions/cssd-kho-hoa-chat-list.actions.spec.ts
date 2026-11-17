import { beforeEach, describe, expect, it, vi } from "vitest";

type Query = {
  eqs: Array<[string, unknown]>;
  isNulls: Array<[string, unknown]>;
  nots: Array<[string, string, unknown]>;
  orders: Array<[string, boolean | undefined]>;
  limit?: number;
};

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  queries: [] as Query[],
  recent: [] as Array<Record<string, unknown>>,
  pending: [] as Array<Record<string, unknown>>,
  pendingError: null as null | { message: string },
  daCoDuyet: [] as Array<Record<string, unknown>>,
  chuaCoDuyet: [] as Array<Record<string, unknown>>,
  windowError: null as null | { message: string; nhom: "co_duyet_at" | "chua_duyet_at" },
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/fetch-all-range", () => ({ fetchAllRangeRows: vi.fn() }));
vi.mock("./cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  mapFkError: (m: string) => m,
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table !== "cssd_fact_kho_hoa_chat_giao_dich") {
        const lookup = { select: () => lookup, in: async () => ({ data: [], error: null }) };
        return lookup;
      }
      const q: Query = { eqs: [], isNulls: [], nots: [], orders: [] };
      mocks.queries.push(q);
      const b = {
        select: () => b,
        eq: (col: string, val: unknown) => {
          q.eqs.push([col, val]);
          return b;
        },
        is: (col: string, val: unknown) => {
          q.isNulls.push([col, val]);
          return b;
        },
        not: (col: string, op: string, val: unknown) => {
          q.nots.push([col, op, val]);
          return b;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          q.orders.push([col, opts?.ascending]);
          return b;
        },
        limit: async (n: number) => {
          q.limit = n;
          const nhom = q.nots.length ? "co_duyet_at" : q.isNulls.length ? "chua_duyet_at" : null;
          if (nhom) {
            if (mocks.windowError?.nhom === nhom) return { data: null, error: mocks.windowError };
            return { data: nhom === "co_duyet_at" ? mocks.daCoDuyet : mocks.chuaCoDuyet, error: null };
          }
          const isPending = q.eqs.some(([c, v]) => c === "trang_thai" && v === "CHO_DUYET");
          if (isPending && mocks.pendingError) return { data: null, error: mocks.pendingError };
          return { data: isPending ? mocks.pending : mocks.recent, error: null };
        },
      };
      return b;
    },
  }),
}));

import { listGiaoDichKhoHoaChatAction } from "./cssd-kho-hoa-chat-list.actions";

const row = (id: string, trang_thai: string, created_at: string, duyet_at: string | null = null) => ({
  id,
  ma_phieu: `PX-${id}`,
  dm_hoa_chat_id: "dm-1",
  loai_giao_dich: "XUAT",
  so_luong_co_dau: -1,
  created_at,
  duyet_at,
  trang_thai,
  is_active: true,
});

describe("listGiaoDichKhoHoaChatAction: include_cho_duyet (CSSD-030)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queries.length = 0;
    mocks.pendingError = null;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.recent = [row("r1", "DA_DUYET", "2026-11-14T08:00:00Z"), row("r2", "DA_DUYET", "2026-11-14T07:00:00Z")];
    mocks.pending = [row("p-old", "CHO_DUYET", "2026-10-01T08:00:00Z")];
  });

  it("phiếu chờ duyệt cũ hơn cửa sổ limit vẫn có trong kết quả", async () => {
    const r = await listGiaoDichKhoHoaChatAction({ limit: 120, include_cho_duyet: true });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual(["r1", "r2", "p-old"]);
    expect(r.data.find((x) => x.id === "p-old")?.trang_thai).toBe("CHO_DUYET");
  });

  it("phiếu chờ duyệt đã nằm trong cửa sổ không bị lặp", async () => {
    mocks.recent = [row("r1", "CHO_DUYET", "2026-11-14T08:00:00Z"), row("r2", "DA_DUYET", "2026-11-14T07:00:00Z")];
    mocks.pending = [row("r1", "CHO_DUYET", "2026-11-14T08:00:00Z"), row("p-old", "CHO_DUYET", "2026-10-01T08:00:00Z")];
    const r = await listGiaoDichKhoHoaChatAction({ limit: 120, include_cho_duyet: true });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual(["r1", "r2", "p-old"]);
  });

  it("không bật cờ: chỉ một truy vấn, không kèm phiếu chờ duyệt ngoài cửa sổ", async () => {
    const r = await listGiaoDichKhoHoaChatAction({ limit: 120 });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(mocks.queries).toHaveLength(1);
    expect(r.data.map((x) => x.id)).toEqual(["r1", "r2"]);
  });

  it("truy vấn chờ duyệt lọc đúng trạng thái, đúng mặt hàng, trần 500", async () => {
    await listGiaoDichKhoHoaChatAction({ limit: 120, include_cho_duyet: true, dm_hoa_chat_id: "dm-1" });
    expect(mocks.queries).toHaveLength(2);
    const [recentQ, pendingQ] = mocks.queries;
    expect(recentQ.eqs).toContainEqual(["dm_hoa_chat_id", "dm-1"]);
    expect(recentQ.eqs.some(([c]) => c === "trang_thai")).toBe(false);
    expect(pendingQ.eqs).toContainEqual(["trang_thai", "CHO_DUYET"]);
    expect(pendingQ.eqs).toContainEqual(["dm_hoa_chat_id", "dm-1"]);
    expect(pendingQ.eqs).toContainEqual(["is_active", true]);
    expect(pendingQ.limit).toBe(500);
  });

  it("truy vấn chờ duyệt lỗi: trả lỗi, không hiện danh sách thiếu phiếu", async () => {
    mocks.pendingError = { message: "boom" };
    const r = await listGiaoDichKhoHoaChatAction({ limit: 120, include_cho_duyet: true });
    expect(r).toEqual({ success: false, error: "boom" });
  });
});

// CSSD-036: PostgREST không ORDER BY coalesce(duyet_at, created_at) → cửa sổ = hai nhóm (có / chưa có duyet_at) gộp rồi cắt.
describe("listGiaoDichKhoHoaChatAction: theo_ngay_hieu_luc (CSSD-036)", () => {
  const opts = { dm_hoa_chat_id: "dm-1", theo_ngay_hieu_luc: true };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queries.length = 0;
    mocks.windowError = null;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.recent = [];
    mocks.pending = [];
    mocks.daCoDuyet = [];
    mocks.chuaCoDuyet = [];
  });

  it("gộp hai nhóm rồi xếp giảm dần theo duyet_at ?? created_at", async () => {
    mocks.daCoDuyet = [
      row("x", "DA_DUYET", "2026-10-01T08:00:00Z", "2026-11-14T09:00:00Z"),
      row("y", "DA_DUYET", "2026-11-13T10:00:00Z", "2026-11-13T11:00:00Z"),
    ];
    mocks.chuaCoDuyet = [row("l", "DA_DUYET", "2026-11-14T08:00:00Z")];
    const r = await listGiaoDichKhoHoaChatAction({ limit: 200, ...opts });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual(["x", "l", "y"]);
  });

  it("cắt đúng limit sau khi gộp: bỏ các dòng có ngày hiệu lực cũ nhất của cả hai nhóm", async () => {
    const ngay = (n: number, gio: string) => `2026-11-${10 + n}T${gio}:00:00Z`;
    mocks.daCoDuyet = [6, 5, 4, 3, 2, 1].map((n) => row(`a${n}`, "DA_DUYET", "2026-10-01T00:00:00Z", ngay(n, "12")));
    mocks.chuaCoDuyet = [6, 5, 4, 3, 2, 1].map((n) => row(`b${n}`, "DA_DUYET", ngay(n, "06")));
    const r = await listGiaoDichKhoHoaChatAction({ limit: 10, ...opts });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual(["a6", "b6", "a5", "b5", "a4", "b4", "a3", "b3", "a2", "b2"]);
    expect(mocks.queries.map((q) => q.limit)).toEqual([10, 10]);
  });

  it("mỗi nhóm lọc và xếp theo đúng khóa, cùng lọc mặt hàng", async () => {
    await listGiaoDichKhoHoaChatAction({ limit: 120, ...opts });
    expect(mocks.queries).toHaveLength(2);
    const co = mocks.queries.find((q) => q.nots.length);
    const chua = mocks.queries.find((q) => q.isNulls.length);
    expect(co?.nots).toEqual([["duyet_at", "is", null]]);
    expect(co?.orders).toEqual([["duyet_at", false]]);
    expect(chua?.isNulls).toEqual([["duyet_at", null]]);
    expect(chua?.orders).toEqual([["created_at", false]]);
    for (const q of mocks.queries) {
      expect(q.eqs).toContainEqual(["dm_hoa_chat_id", "dm-1"]);
      expect(q.eqs).toContainEqual(["is_active", true]);
      expect(q.limit).toBe(120);
    }
  });

  it.each(["co_duyet_at", "chua_duyet_at"] as const)("truy vấn nhóm %s lỗi: trả lỗi, không trả cửa sổ thiếu", async (nhom) => {
    mocks.windowError = { message: "boom-cua-so", nhom };
    const r = await listGiaoDichKhoHoaChatAction({ limit: 120, ...opts });
    expect(r).toEqual({ success: false, error: "boom-cua-so" });
  });
});
