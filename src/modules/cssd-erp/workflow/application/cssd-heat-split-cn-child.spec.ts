import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => "u1") }));

import {
  applyHeatSplitAfterLoaiDowngrade,
  applyHeatSplitAfterLoaiUpgrade,
  applyHeatSplitForAllLowHeatLoai,
  syncHeatSplitAfterBomWrite,
  syncHeatSplitForBoTong,
} from "./cssd-heat-split-apply";

type BoRow = { id: string; ma_bo: string; parent_bo_id?: string | null };

/** Mock: dòng BOM (kèm bộ chứa) + bảng bộ; rpc ghi lại lời gọi; không có đường update/insert nào. */
function makeSupabase(opts: {
  lines?: { bo_dung_cu_id: string; bo: { id: string; is_active?: boolean; parent_bo_id?: string | null } }[];
  bos?: BoRow[];
  rpc?: (id: string) => { data?: unknown; error?: { message: string } | null };
  lowLoai?: string[];
  failLines?: boolean;
} = {}) {
  const rpcCalls: string[] = [];
  const writes: string[] = [];
  const bos = opts.bos ?? [];
  const from = (table: string) => {
    let cols = "";
    const resolve = () => {
      if (table === "cssd_dm_bo_dung_cu_chi_tiet")
        return opts.failLines ? { data: null, error: { message: "boom" } } : { data: opts.lines ?? [], error: null };
      if (table === "cssd_dm_bo_dung_cu") return { data: bos, error: null };
      if (table === "cssd_dm_loai_dung_cu") return { data: (opts.lowLoai ?? []).map((id) => ({ id })), error: null };
      return { data: [], error: null };
    };
    const q: Record<string, unknown> = {
      select(c: string) { cols = c; return q; },
      insert() { writes.push(`${table}:insert`); return q; },
      update() { writes.push(`${table}:update`); return q; },
      upsert() { writes.push(`${table}:upsert`); return q; },
      eq: () => q,
      in: () => q,
      then(f: (v: unknown) => unknown, r?: (e: unknown) => unknown) { void cols; return Promise.resolve(resolve()).then(f, r); },
    };
    return q;
  };
  const rpc = async (_fn: string, args: { p_bo_tong_id: string }) => {
    rpcCalls.push(args.p_bo_tong_id);
    return opts.rpc ? opts.rpc(args.p_bo_tong_id) : { data: {}, error: null };
  };
  return { client: { from, rpc } as never, rpcCalls, writes };
}

const TONG: BoRow[] = [{ id: "p1", ma_bo: "P1" }];

describe("syncHeatSplitForBoTong", () => {
  it("khử trùng, quy bộ con về bộ tổng, gọi RPC đúng một lần cho mỗi bộ tổng", async () => {
    const { client, rpcCalls } = makeSupabase({
      bos: [{ id: "cn-1", ma_bo: "P1-CN", parent_bo_id: "p1" }, ...TONG],
      rpc: () => ({ data: { created: [{ ma_bo: "P1-CN" }, { ma_bo: "P1-KCN" }] }, error: null }),
    });
    const res = await syncHeatSplitForBoTong(client, ["cn-1", "p1", "p1", ""]);
    expect(rpcCalls).toEqual(["p1"]);
    expect(res.split).toEqual([{ maBo: "P1", maSub: "P1-CN+P1-KCN", movedLines: 0 }]);
  });

  it("lỗi RPC vào skipped/errors, không ném; bộ khác vẫn chạy", async () => {
    const { client, rpcCalls } = makeSupabase({
      bos: [...TONG, { id: "p2", ma_bo: "P2" }],
      rpc: (id) => (id === "p1" ? { error: { message: "42501" } } : { data: {}, error: null }),
    });
    const res = await syncHeatSplitForBoTong(client, ["p1", "p2"]);
    expect(rpcCalls).toEqual(["p1", "p2"]);
    expect(res.skipped).toHaveLength(1);
    expect(res.skipped[0].reason).toContain("42501");
    expect(res.errors).toEqual([{ maBo: "P1", message: "42501" }]);
  });

  it("bộ con đang chạy quy trình (pending) → skipped, không phải lỗi", async () => {
    const { client } = makeSupabase({ bos: TONG, rpc: () => ({ data: { pending: [{ ma_bo: "P1-KCN" }] }, error: null }) });
    const res = await syncHeatSplitForBoTong(client, ["p1"]);
    expect(res.skipped[0].reason).toContain("P1-KCN");
    expect(res.errors).toHaveLength(0);
  });
});

describe("applyHeatSplitAfterLoaiDowngrade / Upgrade", () => {
  const lines = [
    { bo_dung_cu_id: "p1", bo: { id: "p1", is_active: true } },
    { bo_dung_cu_id: "cn-1", bo: { id: "cn-1", is_active: true, parent_bo_id: "p1" } },
  ];
  it("dòng trên bộ con → RPC cho bộ cha, khử trùng, không update dòng chi tiết nào", async () => {
    const { client, rpcCalls, writes } = makeSupabase({ lines, bos: TONG });
    await applyHeatSplitAfterLoaiDowngrade(client, "loai-1", true, false);
    expect(rpcCalls).toEqual(["p1"]);
    expect(writes).toEqual([]);
  });
  it("không gọi RPC nếu không phải chiều đổi tương ứng", async () => {
    const { client, rpcCalls } = makeSupabase({ lines, bos: TONG });
    await applyHeatSplitAfterLoaiDowngrade(client, "loai-1", false, false);
    await applyHeatSplitAfterLoaiUpgrade(client, "loai-1", true, true);
    expect(rpcCalls).toEqual([]);
  });
  it("nâng lên chịu nhiệt → gọi RPC bộ tổng", async () => {
    const { client, rpcCalls } = makeSupabase({ lines, bos: TONG });
    await applyHeatSplitAfterLoaiUpgrade(client, "loai-1", false, true);
    expect(rpcCalls).toEqual(["p1"]);
  });
});

describe("applyHeatSplitForAllLowHeatLoai", () => {
  it("gom bộ tổng của mọi loại nhiệt thấp rồi gọi RPC một lần mỗi bộ", async () => {
    const { client, rpcCalls } = makeSupabase({
      lowLoai: ["a", "b"],
      lines: [{ bo_dung_cu_id: "p1", bo: { id: "p1", is_active: true } }],
      bos: TONG,
    });
    const out = await applyHeatSplitForAllLowHeatLoai(client);
    expect(out.loaiCount).toBe(2);
    expect(rpcCalls).toEqual(["p1"]);
  });
});

describe("syncHeatSplitAfterBomWrite", () => {
  it("lỗi RPC → trả cảnh báo và console.error, không ném", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeSupabase({ bos: TONG, rpc: () => ({ error: { message: "x" } }) });
    const warn = await syncHeatSplitAfterBomWrite(client, { boIds: ["p1"] }, "test");
    expect(warn).toContain("đồng bộ tách nhiệt lỗi");
    expect(err).toHaveBeenCalledWith(expect.objectContaining({ module: "CSSD_HEAT_SPLIT", action: "test", userId: "u1" }));
    err.mockRestore();
  });
  it("lỗi tra dòng chi tiết cũng không ném", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeSupabase({ failLines: true });
    expect(await syncHeatSplitAfterBomWrite(client, { lineIds: ["l1"] }, "test")).toContain("boom");
    err.mockRestore();
  });
  it("thành công → undefined", async () => {
    const { client } = makeSupabase({ bos: TONG });
    expect(await syncHeatSplitAfterBomWrite(client, { boIds: ["p1"] }, "test")).toBeUndefined();
  });
});
