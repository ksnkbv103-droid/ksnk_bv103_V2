import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
type Recorded = {
  eqs: Array<[string, unknown]>;
  neqs: Array<[string, unknown]>;
  ins: Array<[string, unknown[]]>;
  window?: [number, number];
};
type Builder = {
  select: (cols?: string) => Builder;
  eq: (col: string, val: unknown) => Builder;
  neq: (col: string, val: unknown) => Builder;
  in: (col: string, vals: unknown[]) => Builder;
  order: (col: string, opts?: unknown) => Builder;
  limit: (n: number) => Builder;
  range: (from: number, to: number) => Builder;
  then: PromiseLike<Result>["then"];
};

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  incidents: [] as Array<Record<string, unknown>>,
  linkedSuCoIds: new Set<string>(),
  linkedError: null as null | { message: string },
  dms: [] as Array<Record<string, unknown>>,
  suCoCalls: [] as Array<{ window?: [number, number] }>,
  linkedCalls: [] as Array<{
    eqs: Array<[string, unknown]>;
    neqs: Array<[string, unknown]>;
    ins: Array<[string, unknown[]]>;
  }>,
}));

function makeBuilder(table: string): Builder {
  const rec: Recorded = { eqs: [], neqs: [], ins: [] };
  if (table === "cssd_fact_su_co") mocks.suCoCalls.push(rec);
  if (table === "cssd_fact_kho_hoa_chat_giao_dich") mocks.linkedCalls.push(rec);
  const run = (): Result => {
    if (table === "cssd_fact_su_co") {
      const [from, to] = rec.window ?? [0, Number.MAX_SAFE_INTEGER];
      return { data: mocks.incidents.slice(from, to + 1), error: null };
    }
    if (table === "cssd_fact_kho_hoa_chat_giao_dich") {
      if (mocks.linkedError) return { data: null, error: mocks.linkedError };
      const ids = rec.ins.find(([c]) => c === "su_co_id")?.[1] ?? [];
      return {
        data: ids.filter((id) => mocks.linkedSuCoIds.has(String(id))).map((su_co_id) => ({ su_co_id })),
        error: null,
      };
    }
    const [col, vals] = rec.ins[0] ?? ["id", []];
    return { data: mocks.dms.filter((d) => vals.includes(d[col])), error: null };
  };
  const b: Builder = {
    select: () => b,
    eq: (col, val) => {
      rec.eqs.push([col, val]);
      return b;
    },
    neq: (col, val) => {
      rec.neqs.push([col, val]);
      return b;
    },
    in: (col, vals) => {
      rec.ins.push([col, vals]);
      return b;
    },
    order: () => b,
    limit: (n) => {
      rec.window = [0, n - 1];
      return b;
    },
    range: (from, to) => {
      rec.window = [from, to];
      return b;
    },
    then: (onFulfilled, onRejected) => Promise.resolve(run()).then(onFulfilled, onRejected),
  };
  return b;
}

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("./cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  mapFkError: (m: string) => m,
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ from: (table: string) => makeBuilder(table) }),
}));

import { listSuCoChemicalChuaGhiKhoAction } from "./cssd-kho-hoa-chat-su-co.actions";

const CHEM_ID = "11111111-1111-4111-8111-111111111111";
const scId = (n: number) => `sc-${String(n).padStart(4, "0")}`;
const incident = (n: number): Row => ({
  id: scId(n),
  mo_ta: `Sự cố ${n}`,
  attributes: { MACHINE_ID: CHEM_ID, ERROR_QR: `LO-${n}` },
  incident_type_label: "Tràn hóa chất",
  created_at: new Date(Date.UTC(2026, 10, 14) - n * 60_000).toISOString(),
});
const incidents = (count: number) => Array.from({ length: count }, (_, i) => incident(i + 1));
const markLinked = (upTo: number) => {
  for (let i = 1; i <= upTo; i++) mocks.linkedSuCoIds.add(scId(i));
};

describe("listSuCoChemicalChuaGhiKhoAction: lọc «đã ghi kho» trước khi cắt danh sách (CSSD-031)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.suCoCalls.length = 0;
    mocks.linkedCalls.length = 0;
    mocks.linkedSuCoIds.clear();
    mocks.linkedError = null;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.incidents = [];
    mocks.dms = [{ id: CHEM_ID, ma_hoa_chat: "HC-01", ten_hoa_chat: "Hóa chất 01" }];
  });

  it("sự cố cũ chưa ghi kho vẫn hiện khi 40 sự cố mới nhất đều đã có phiếu", async () => {
    mocks.incidents = incidents(46);
    markLinked(45);
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual([scId(46)]);
    expect(r.data[0]).toMatchObject({ ma_hoa_chat: "HC-01", ten_hoa_chat: "Hóa chất 01", ma_lo: "LO-46" });
  });

  it("quét qua nhiều trang: sự cố chưa ghi kho nằm sau 120 sự cố đã ghi, mỗi lần tra liên kết ≤ 100 id", async () => {
    mocks.incidents = incidents(121);
    markLinked(120);
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.map((x) => x.id)).toEqual([scId(121)]);
    expect(mocks.suCoCalls.length).toBeGreaterThan(1);
    for (const q of mocks.linkedCalls) {
      const ids = q.ins.find(([c]) => c === "su_co_id")?.[1] ?? [];
      expect(ids.length).toBeLessThanOrEqual(100);
    }
    // Các trang liền nhau, không chồng, không hở.
    for (let i = 1; i < mocks.suCoCalls.length; i++) {
      const prev = mocks.suCoCalls[i - 1].window!;
      const cur = mocks.suCoCalls[i].window!;
      expect(cur[0]).toBe(prev[1] + 1);
    }
  });

  it("tối đa 40 sự cố chưa ghi kho, mới nhất trước", async () => {
    mocks.incidents = incidents(60);
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toHaveLength(40);
    expect(r.data[0].id).toBe(scId(1));
    expect(r.data[39].id).toBe(scId(40));
  });

  it("ít sự cố: chỉ một lần quét", async () => {
    mocks.incidents = incidents(3);
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toHaveLength(3);
    expect(mocks.suCoCalls).toHaveLength(1);
  });

  it("không quét vô hạn: dừng sau 20 trang dù mọi sự cố đều đã ghi kho", async () => {
    mocks.incidents = incidents(2000);
    markLinked(2000);
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r).toEqual({ success: true, data: [] });
    expect(mocks.suCoCalls).toHaveLength(20);
  });

  it("truy vấn liên kết lỗi: trả lỗi, không coi mọi sự cố là chưa ghi kho", async () => {
    mocks.incidents = incidents(1);
    mocks.linkedError = { message: "boom" };
    const r = await listSuCoChemicalChuaGhiKhoAction();
    expect(r).toEqual({ success: false, error: "boom" });
  });

  it("liên kết chỉ tính phiếu còn hiệu lực và chưa bị từ chối (HC-C)", async () => {
    mocks.incidents = incidents(1);
    await listSuCoChemicalChuaGhiKhoAction();
    const q = mocks.linkedCalls[0];
    expect(q.eqs).toContainEqual(["is_active", true]);
    expect(q.neqs).toContainEqual(["trang_thai", "TU_CHOI"]);
  });
});
