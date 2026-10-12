import { describe, expect, it } from "vitest";
import { applyHeatSplitAfterLoaiDowngrade } from "./cssd-heat-split-apply";

/** Cột thật của cssd_fact_quy_trinh (không có ma_trang_thai_hien_tai). */
const FACT_COLS = new Set(["id", "ma_qr_quy_trinh", "ma_qr_bo_vinh_vien", "bo_dung_cu_id", "tram_hien_tai_id", "is_active", "updated_at", "quy_trinh_cha_id", "ma_vai_tro_bo"]);

type Call = { table: string; op: "select" | "insert" | "update"; payload: unknown };

function makeSupabase() {
  const calls: Call[] = [];
  const fakeFrom = (table: string) => {
    let op: Call["op"] = "select";
    let cols = "";
    let single = false;
    const resolve = () => {
      if (op === "insert") return { data: null, error: null };
      if (table === "cssd_dm_bo_dung_cu" && cols === "id, ma_bo" && single) return { data: { id: `${table}-new`, ma_bo: "B1-X" }, error: null };
      if (table === "cssd_dm_bo_dung_cu_chi_tiet" && cols.startsWith("id, so_luong, ten_dung_cu_le, bo_dung_cu_id"))
        return { data: [{ bo: { id: "bo-1", is_active: true } }], error: null };
      if (table === "cssd_dm_bo_dung_cu_chi_tiet" && cols.includes("loai:"))
        return {
          data: [
            { id: "c1", loai_dung_cu_id: "l1", ten_dung_cu_le: "", so_luong: 1, loai: { is_chiu_nhiet: true } },
            { id: "c2", loai_dung_cu_id: "l2", ten_dung_cu_le: "", so_luong: 1, loai: { is_chiu_nhiet: false } },
          ],
          error: null,
        };
      if (table === "cssd_dm_bo_dung_cu" && cols.includes("ten_bo")) return { data: { id: "bo-1", ma_bo: "B1", ten_bo: "B1" }, error: null };
      if (table === "v_cssd_quy_trinh_full" && cols.includes("ma_vai_tro_bo")) return { data: [{ id: "qt-1", ma_trang_thai_hien_tai: "DONG_GOI", ma_vai_tro_bo: "DON" }], error: null };
      if (table === "v_cssd_quy_trinh_full") return { data: { ma_trang_thai_hien_tai: "DONG_GOI" }, error: null };
      if (table === "cssd_dm_tram") return { data: { id: "tram-dg" }, error: null };
      return { data: null, error: null };
    };
    const q: Record<string, unknown> = {
      select(c: string) {
        if (op !== "insert") op = "select";
        cols = c;
        calls.push({ table, op: "select", payload: c });
        return q;
      },
      insert(row: unknown) { op = "insert"; calls.push({ table, op, payload: row }); return q; },
      update(row: unknown) { op = "update"; calls.push({ table, op, payload: row }); return q; },
      single() { single = true; return Promise.resolve(table === "cssd_dm_bo_dung_cu" ? { data: { id: `new-${calls.length}`, ma_bo: "B1-X" }, error: null } : resolve()); },
      maybeSingle() { single = true; return Promise.resolve(resolve()); },
      limit() { return Promise.resolve({ data: [], error: null }); },
      then(f: (v: unknown) => unknown, r?: (e: unknown) => unknown) { return Promise.resolve(resolve()).then(f, r); },
    };
    for (const m of ["eq", "in"]) q[m] = () => q;
    return q;
  };
  return { client: { from: fakeFrom } as never, calls };
}

describe("applyHeatSplitAfterLoaiDowngrade", () => {
  it("không select/insert cột ma_trang_thai_hien_tai trên cssd_fact_quy_trinh; ghi tram_hien_tai_id", async () => {
    const { client, calls } = makeSupabase();
    const res = await applyHeatSplitAfterLoaiDowngrade(client, "l2", true, false);
    expect(res.split).toHaveLength(1);

    const fact = calls.filter((c) => c.table === "cssd_fact_quy_trinh");
    for (const c of fact.filter((x) => x.op === "select")) expect(String(c.payload)).not.toContain("ma_trang_thai_hien_tai");
    const inserts = fact.filter((c) => c.op === "insert");
    expect(inserts.length).toBeGreaterThan(0);
    for (const c of inserts) {
      const row = c.payload as Record<string, unknown>;
      expect(Object.keys(row).every((k) => FACT_COLS.has(k))).toBe(true);
      expect(row.tram_hien_tai_id).toBe("tram-dg");
    }
  });
});
