import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tryReceiveChoThuVeAtTiepNhan } from "./recall-receive.application";

type Call = { table: string; op: string; patch?: Record<string, unknown> };
const h = vi.hoisted(() => ({
  calls: [] as { table: string; op: string; patch?: Record<string, unknown> }[],
  resolve: (_c: { table: string; op: string; patch?: Record<string, unknown> }): unknown => ({ data: null, error: null }),
}));

function fakeSupabase(): SupabaseClient {
  const from = (table: string) => {
    const call: Call = { table, op: "select" };
    const b: Record<string, unknown> = {};
    const done = () => {
      h.calls.push({ ...call });
      return Promise.resolve(h.resolve(call));
    };
    b.insert = (p: Record<string, unknown>) => ((call.op = "insert"), (call.patch = p), b);
    b.update = (p: Record<string, unknown>) => ((call.op = "update"), (call.patch = p), b);
    for (const k of ["select", "eq", "is"]) b[k] = () => b;
    b.maybeSingle = done;
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => done().then(res, rej);
    return b;
  };
  return { from } as unknown as SupabaseClient;
}

const META = { thu_hoi: { trang_thai: "CHO_THU_VE", su_co_id: "sc-1" } };
const opts = {
  quyTrinh: { id: "old-1", metadata: META, ma_qr_quy_trinh: "Q", bo_dung_cu_id: "b" },
  operatorLabel: "op",
};

describe("tryReceiveChoThuVeAtTiepNhan", () => {
  beforeEach(() => {
    h.calls.length = 0;
  });

  it("CSSD-021: update chu trình cũ lỗi thì vô hiệu chu trình mới rồi mới throw", async () => {
    h.resolve = (c) => {
      if (c.table === "cssd_dm_tram") return { data: { id: "tn" }, error: null };
      if (c.op === "insert") return { data: { id: "new-1" }, error: null };
      if (c.op === "update" && c.patch?.is_dong_bang === true) return { data: null, error: { message: "db down" } };
      return { data: null, error: null };
    };
    await expect(tryReceiveChoThuVeAtTiepNhan(fakeSupabase(), opts)).rejects.toThrow("db down");
    const updates = h.calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(2);
    expect(updates[1].patch).toMatchObject({ is_active: false });
  });

  it("CSSD-022: cập nhật phiếu sự cố lỗi thì vẫn handled nhưng có cờ incidentPatchFailed", async () => {
    h.resolve = (c) => {
      if (c.table === "cssd_dm_tram") return { data: { id: "tn" }, error: null };
      if (c.op === "insert") return { data: { id: "new-1" }, error: null };
      if (c.table === "cssd_fact_quy_trinh" && c.op === "update") return { data: [{ id: "old-1" }], error: null };
      if (c.table === "cssd_fact_su_co" && c.op === "select") {
        return { data: { id: "sc-1", attributes: {}, mo_ta: "", updated_at: "t" }, error: null };
      }
      if (c.table === "cssd_fact_su_co" && c.op === "update") return { data: null, error: { message: "boom" } };
      return { data: null, error: null };
    };
    const r = await tryReceiveChoThuVeAtTiepNhan(fakeSupabase(), opts);
    expect(r).toMatchObject({ handled: true, newQuyTrinhId: "new-1", incidentPatchFailed: true });
  });
});
