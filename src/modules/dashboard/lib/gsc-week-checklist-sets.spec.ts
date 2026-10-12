import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchGscWeeksUseDifferentChecklists,
  GSC_WEEK_SETS_ROW_CAP,
  weeksUseDifferentChecklists,
} from "./gsc-week-checklist-sets";

const weeks = { prev: "2026-09-28", cur: "2026-10-05" };
const row = (bang_kiem_id: string | null, ngay_giam_sat: string) => ({ bang_kiem_id, ngay_giam_sat });

describe("weeksUseDifferentChecklists", () => {
  it("cùng bộ bảng kiểm → false", () => {
    const rows = [row("A", "2026-09-29"), row("B", "2026-10-01"), row("B", "2026-10-06"), row("A", "2026-10-07")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(false);
  });

  it("tuần cuối chỉ chấm một bảng kiểm khác (ca T40 vs T41) → true", () => {
    const rows = [row("A", "2026-09-29"), row("B", "2026-10-01"), row("C", "2026-10-06")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(true);
  });

  it("bảng kiểm ngoài phạm vi tổng GSC (BM.02/03) không làm lệch", () => {
    const rows = [row("A", "2026-09-29"), row("HUB", "2026-09-30"), row("A", "2026-10-06")];
    expect(weeksUseDifferentChecklists(rows, weeks, new Set(["A"]))).toBe(false);
  });

  it("thiếu dữ liệu một tuần hoặc id rỗng → null, không kết luận bừa", () => {
    expect(weeksUseDifferentChecklists([row("A", "2026-09-29")], weeks)).toBeNull();
    expect(weeksUseDifferentChecklists([row(null, "2026-09-29"), row("A", "2026-10-06")], weeks)).toBeNull();
  });

  it("phiên ngoài hai tuần bị bỏ qua", () => {
    const rows = [row("Z", "2026-09-20"), row("A", "2026-09-29"), row("A", "2026-10-06")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(false);
  });

  it("tuần trước (A,B) vs tuần này (A) — khác kích thước → true", () => {
    const rows = [row("A", "2026-09-29"), row("B", "2026-09-30"), row("A", "2026-10-06")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(true);
  });

  it("cùng kích thước nhưng khác id (A,B vs A,C) → true", () => {
    const rows = [row("A", "2026-09-29"), row("B", "2026-09-30"), row("A", "2026-10-06"), row("C", "2026-10-07")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(true);
  });

  it("allowed là Set rỗng → mọi dòng bị loại → null", () => {
    const rows = [row("A", "2026-09-29"), row("A", "2026-10-06")];
    expect(weeksUseDifferentChecklists(rows, weeks, new Set())).toBeNull();
  });

  it("ngày dạng timestamp vẫn được tính", () => {
    const rows = [row("A", "2026-09-29T07:00:00"), row("A", "2026-10-06T08:00:00")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(false);
  });

  it("ngày sau cuối tuần cur (>= cur + 7) bị bỏ qua, không làm lệch kết quả", () => {
    const rows = [row("A", "2026-09-29"), row("A", "2026-10-06"), row("B", "2026-10-12")];
    expect(weeksUseDifferentChecklists(rows, weeks)).toBe(false);
    // ngày cuối tuần cur (Chủ nhật 11/10) vẫn được tính
    expect(weeksUseDifferentChecklists([row("A", "2026-09-29"), row("B", "2026-10-11")], weeks)).toBe(true);
  });
});

describe("fetchGscWeeksUseDifferentChecklists", () => {
  type Res = { data: unknown; error: unknown };
  const mk = (dm: Res | Error, sessions: Res | Error) => {
    const calls = { from: [] as string[], inKhoa: [] as string[][], limit: [] as number[], inMa: [] as string[][] };
    const settle = (r: Res | Error) => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r));
    const limit = (n: number) => {
      calls.limit.push(n);
      return settle(sessions);
    };
    const afterLte = {
      limit,
      in: (c: string, v: string[]) => {
        if (c === "khoa_id") calls.inKhoa.push(v);
        return { limit };
      },
    };
    const supabase = {
      from: (t: string) => {
        calls.from.push(t);
        if (t === "gstt_dm_bang_kiem") {
          return {
            select: () => ({
              in: (_c: string, v: string[]) => {
                calls.inMa.push(v);
                return settle(dm);
              },
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ gte: () => ({ lte: () => afterLte }) }) }),
        };
      },
    };
    return { supabase, calls };
  };
  const dmOk = { data: [{ id: "A" }, { id: "B" }, { id: "C" }], error: null };
  const rows = (...p: [string, string][]) => p.map(([bang_kiem_id, ngay_giam_sat]) => ({ bang_kiem_id, ngay_giam_sat }));

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([null, []])("bangKiemMas %j → null và không gọi supabase.from", async (mas) => {
    const { supabase, calls } = mk(dmOk, { data: [], error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, mas)).toBeNull();
    expect(calls.from).toHaveLength(0);
  });

  it("dm_bang_kiem lỗi → null", async () => {
    const { supabase } = mk({ data: null, error: { message: "x" } }, { data: [], error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).toBeNull();
  });

  it("truy vấn phiên lỗi → null", async () => {
    const { supabase } = mk(dmOk, { data: null, error: { message: "x" } });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).toBeNull();
  });

  it("phiên trả đúng trần dòng → null (dữ liệu có thể bị cắt)", async () => {
    const data = Array.from({ length: GSC_WEEK_SETS_ROW_CAP }, () => ({ bang_kiem_id: "A", ngay_giam_sat: "2026-10-06" }));
    const { supabase, calls } = mk(dmOk, { data, error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).toBeNull();
    expect(calls.limit).toEqual([GSC_WEEK_SETS_ROW_CAP]);
  });

  it("2 bảng kiểm tuần trước, 1 bảng kiểm tuần này → true", async () => {
    const data = rows(["A", "2026-09-29"], ["B", "2026-09-30"], ["A", "2026-10-06"]);
    const { supabase, calls } = mk(dmOk, { data, error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01", "BM.04"])).toBe(true);
    expect(calls.inMa).toEqual([["BM.01", "BM.04"]]);
  });

  it("cùng bộ bảng kiểm → false", async () => {
    const data = rows(["A", "2026-09-29"], ["B", "2026-09-30"], ["B", "2026-10-06"], ["A", "2026-10-07"]);
    const { supabase } = mk(dmOk, { data, error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).toBe(false);
  });

  it("bảng kiểm ngoài danh mục cho phép bị loại", async () => {
    const data = rows(["A", "2026-09-29"], ["HUB", "2026-09-30"], ["A", "2026-10-06"]);
    const { supabase } = mk(dmOk, { data, error: null });
    expect(await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).toBe(false);
  });

  it("có khoaIds → gọi in('khoa_id', ids)", async () => {
    const { supabase, calls } = mk(dmOk, { data: rows(["A", "2026-09-29"], ["A", "2026-10-06"]), error: null });
    await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"], ["k1"]);
    expect(calls.inKhoa).toEqual([["k1"]]);
  });

  it.each([undefined, null, []])("khoaIds %j → không gọi in('khoa_id')", async (khoa) => {
    const { supabase, calls } = mk(dmOk, { data: rows(["A", "2026-09-29"], ["A", "2026-10-06"]), error: null });
    await fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"], khoa);
    expect(calls.inKhoa).toHaveLength(0);
  });

  it("mock ném exception → null, không văng ra ngoài", async () => {
    const { supabase } = mk(new Error("boom"), { data: [], error: null });
    await expect(fetchGscWeeksUseDifferentChecklists(supabase, weeks, ["BM.01"])).resolves.toBeNull();
    const m2 = mk(dmOk, new Error("boom"));
    await expect(fetchGscWeeksUseDifferentChecklists(m2.supabase, weeks, ["BM.01"])).resolves.toBeNull();
  });
});
