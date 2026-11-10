import { describe, expect, it } from "vitest";
import {
  applyHeatSplitAfterLoaiDowngrade,
  applyHeatSplitAfterLoaiUpgrade,
  applyHeatSplitForAllLowHeatLoai,
} from "./cssd-heat-split-apply";

type Upd = { table: string; row: unknown; inIds: unknown };

/** Mock theo bảng: bộ -CN (con) chứa 1 dòng loại nhiệt thấp + 1 dòng chịu nhiệt. */
function makeSupabase(opts: { failLoaiSelect?: boolean; upgrade?: boolean } = {}) {
  const updates: Upd[] = [];
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const from = (table: string) => {
    let cols = "";
    let op: "select" | "insert" | "update" = "select";
    let row: unknown;
    let inIds: unknown;
    const resolve = (): { data: unknown; error: { message: string } | null } => {
      if (op === "update") {
        updates.push({ table, row, inIds });
        return { data: null, error: null };
      }
      if (op === "insert") return { data: { id: "kcn-new", ma_bo: "P1-KCN" }, error: null };
      if (table === "cssd_dm_bo_dung_cu_chi_tiet" && cols.includes("bo:"))
        return {
          data: [
            {
              bo: opts.upgrade
                ? { id: "kcn-1", ma_bo: "P1-KCN", is_active: true, parent_bo_id: "p1", vai_tro_tach: "KHONG_CHIU_NHIET" }
                : { id: "cn-1", is_active: true },
            },
          ],
          error: null,
        };
      if (table === "cssd_dm_bo_dung_cu_chi_tiet" && cols.includes("loai:"))
        return {
          data: [
            { id: "low", loai: { is_chiu_nhiet: false } },
            { id: "heat", loai: { is_chiu_nhiet: true } },
          ],
          error: null,
        };
      if (table === "cssd_dm_bo_dung_cu" && cols === "parent_bo_id, vai_tro_tach")
        return { data: { parent_bo_id: "p1", vai_tro_tach: "CHIU_NHIET" }, error: null };
      if (table === "cssd_dm_bo_dung_cu" && cols.includes("ten_bo") && !cols.includes("khoa")) return { data: { id: "cn-1", ma_bo: "P1-CN", ten_bo: "P1" }, error: null };
      if (table === "cssd_dm_bo_dung_cu" && cols.includes("khoa_su_dung_id")) return { data: { id: "p1", ma_bo: "P1", ten_bo: "P1", khoa_su_dung_id: null, phan_loai_bo: null }, error: null };
      if (table === "cssd_dm_bo_dung_cu" && cols === "id, ma_bo") return { data: null, error: null }; // chưa có -KCN
      if (table === "cssd_dm_bo_dung_cu" && cols === "id") return { data: null, error: null };
      if (table === "cssd_fact_quy_trinh") return { data: null, error: null };
      if (table === "cssd_dm_tram") return { data: { id: "tram" }, error: null };
      if (table === "cssd_dm_loai_dung_cu") {
        return opts.failLoaiSelect
          ? { data: null, error: { message: "boom" } }
          : { data: [{ id: "loai-1" }], error: null };
      }
      return { data: null, error: null };
    };
    const q: Record<string, unknown> = {
      select(c: string) {
        if (op !== "insert") op = "select";
        cols = c;
        return q;
      },
      insert(r: Record<string, unknown>) { op = "insert"; inserts.push({ table, row: r }); return q; },
      update(r: unknown) { op = "update"; row = r; return q; },
      in(_c: string, ids: unknown) { inIds = ids; return q; },
      eq() { return q; },
      limit() { return Promise.resolve({ data: [], error: null }); },
      single() { return Promise.resolve(resolve()); },
      maybeSingle() { return Promise.resolve(resolve()); },
      then(f: (v: unknown) => unknown, r?: (e: unknown) => unknown) { return Promise.resolve(resolve()).then(f, r); },
    };
    return q;
  };
  return { client: { from } as never, updates, inserts };
}

describe("heat split — bộ con -CN còn dòng nhiệt thấp", () => {
  it("chuyển đúng dòng nhiệt thấp sang -KCN cùng cha, không đụng dòng chịu nhiệt", async () => {
    const { client, updates, inserts } = makeSupabase();
    const res = await applyHeatSplitAfterLoaiDowngrade(client, "loai-1", true, false);
    expect(res.skipped).toHaveLength(0);
    expect(res.split).toHaveLength(1);
    expect(res.split[0].movedLines).toBe(1);
    const move = updates.find((u) => u.table === "cssd_dm_bo_dung_cu_chi_tiet");
    expect(move?.inIds).toEqual(["low"]);
    expect((move?.row as { bo_dung_cu_id: string }).bo_dung_cu_id).toBe("kcn-new");
    const kcn = inserts.find((i) => i.table === "cssd_dm_bo_dung_cu");
    expect(kcn?.row.parent_bo_id).toBe("p1");
    expect(kcn?.row.vai_tro_tach).toBe("KHONG_CHIU_NHIET");
  });
});

describe("applyHeatSplitForAllLowHeatLoai", () => {
  it("một loại lỗi không làm dừng lô: lỗi vào skipped", async () => {
    // Loại được liệt kê, nhưng truy vấn BOM của loại đó lỗi → phải ghi skipped, không ném.
    const { client } = makeSupabase();
    const broken = {
      from: (t: string) => {
        const q = (client as unknown as { from: (t: string) => Record<string, unknown> }).from(t);
        if (t === "cssd_dm_bo_dung_cu_chi_tiet") {
          const err = { data: null, error: { message: "boom" } };
          const chain: Record<string, unknown> = {
            select: () => chain,
            eq: () => chain,
            in: () => chain,
            then: (f: (v: unknown) => unknown) => Promise.resolve(err).then(f),
          };
          return chain;
        }
        return q;
      },
    } as never;
    const out = await applyHeatSplitForAllLowHeatLoai(broken);
    expect(out.loaiCount).toBe(1);
    expect(out.result.skipped).toHaveLength(1);
    expect(out.result.skipped[0].reason).toContain("boom");
  });
});

describe("heat split — loại nâng lên chịu nhiệt", () => {
  it("chuyển dòng chịu nhiệt từ -KCN sang -CN cùng cha, không đụng dòng nhiệt thấp", async () => {
    const { client, updates, inserts } = makeSupabase({ upgrade: true });
    const res = await applyHeatSplitAfterLoaiUpgrade(client, "loai-1", false, true);
    expect(res.split).toHaveLength(1);
    expect(res.split[0].movedLines).toBe(1);
    const move = updates.find((u) => u.table === "cssd_dm_bo_dung_cu_chi_tiet");
    expect(move?.inIds).toEqual(["heat"]);
    const cn = inserts.find((i) => i.table === "cssd_dm_bo_dung_cu");
    expect(cn?.row.parent_bo_id).toBe("p1");
    expect(cn?.row.vai_tro_tach).toBe("CHIU_NHIET");
  });
  it("không làm gì nếu không phải chuyển không chịu nhiệt → chịu nhiệt", async () => {
    const { client, updates } = makeSupabase({ upgrade: true });
    const res = await applyHeatSplitAfterLoaiUpgrade(client, "loai-1", true, true);
    expect(res.split).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });
});
