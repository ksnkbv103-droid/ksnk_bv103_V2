import { beforeEach, describe, expect, it, vi } from "vitest";

type Query = { eqs: Array<[string, unknown]>; limit?: number };

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  queries: [] as Array<{ eqs: Array<[string, unknown]>; limit?: number }>,
  recent: [] as Array<Record<string, unknown>>,
  pending: [] as Array<Record<string, unknown>>,
  pendingError: null as null | { message: string },
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
      const q: Query = { eqs: [] };
      mocks.queries.push(q);
      const b = {
        select: () => b,
        eq: (col: string, val: unknown) => {
          q.eqs.push([col, val]);
          return b;
        },
        order: () => b,
        limit: async (n: number) => {
          q.limit = n;
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

const row = (id: string, trang_thai: string, created_at: string) => ({
  id,
  ma_phieu: `PX-${id}`,
  dm_hoa_chat_id: "dm-1",
  loai_giao_dich: "XUAT",
  so_luong_co_dau: -1,
  created_at,
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
