import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchAllByIdChunks, fetchAllRangeRows } from "./fetch-all-range";

describe("fetchAllRangeRows", () => {
  it("đọc hết trang rồi dừng khi trang ngắn", async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllRangeRows(async (from, to) => {
      calls.push([from, to]);
      if (from === 0) return { data: [1, 2], error: null };
      return { data: [3], error: null };
    }, 2);
    expect(rows).toEqual([1, 2, 3]);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("lỗi trang sau không trả phần đã đọc", async () => {
    await expect(
      fetchAllRangeRows(async (from) => {
        if (from === 0) return { data: ["a", "b"], error: null };
        return { data: null, error: { message: "db down" } };
      }, 2),
    ).rejects.toThrow("db down");
  });
});

describe("fetchAllByIdChunks", () => {
  it("chia .in() rồi phân trang từng cụm", async () => {
    const seen: string[][] = [];
    const rows = await fetchAllByIdChunks(
      ["a", "b", "c"],
      async (ids, from) => {
        seen.push(from === 0 ? [...ids] : [...ids, `page-${from}`]);
        if (ids[0] === "a" && from === 0) return { data: [1, 2], error: null };
        if (ids[0] === "a") return { data: [3], error: null };
        return { data: [4], error: null };
      },
      { pageSize: 2, inChunk: 2 },
    );
    expect(rows).toEqual([1, 2, 3, 4]);
    expect(seen).toEqual([["a", "b"], ["a", "b", "page-2"], ["c"]]);
  });

  it("lỗi cụm sau không trả cụm trước như đủ", async () => {
    await expect(
      fetchAllByIdChunks(
        ["a", "b"],
        async (ids) => {
          if (ids[0] === "a") return { data: [1], error: null };
          return { data: null, error: { message: "rls" } };
        },
        { pageSize: 2, inChunk: 1 },
      ),
    ).rejects.toThrow("rls");
  });
});

describe("kiểm kê campaign không cắt im", () => {
  it("bộ và phiếu INSTRUMENT đọc hết trang; worksheet chia cụm", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/cssd-su-co/actions/set-reconcile-campaign.actions.ts"),
      "utf8",
    );
    const campaign = src.slice(
      src.indexOf("export async function listSetReconcileCampaignAction"),
      src.indexOf("export async function listSetReconcileWorksheetRowsAction"),
    );
    expect(campaign).toContain("fetchAllRangeRows");
    expect(campaign).toContain('.eq("incident_group", "INSTRUMENT")');
    expect(campaign).toContain("readSetReconcileStatus");
    expect(campaign).toContain(".range(");
    expect(campaign).not.toContain(".limit(");
    expect(campaign).toContain("success: false");

    const worksheet = src.slice(
      src.indexOf("export async function listSetReconcileWorksheetRowsAction"),
      src.indexOf("async function selectAllPages"),
    );
    expect(worksheet).toContain("fetchAllByIdChunks");
    expect(worksheet).toContain('.in("bo_dung_cu_id", idChunk)');
    expect(worksheet).toContain(".range(");
    expect(worksheet).not.toContain(".limit(");
    expect(worksheet).toContain("success: false");
  });
});

describe("attachTaskRollup", () => {
  it("đọc hết việc con và không nuốt lỗi bằng return rows", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/quan-ly-cong-viec/actions/nhiem-vu.actions.ts"),
      "utf8",
    );
    const start = src.indexOf("async function attachTaskRollup");
    const end = src.indexOf("export async function listNhiemVuByNam");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, end);
    expect(fn).toContain("fetchAllByIdChunks");
    expect(fn).toContain('.eq("is_active", true)');
    expect(fn).toContain(".range(");
    expect(fn).not.toContain(".limit(");
    expect(fn).not.toMatch(/if \(error\)[\s\S]*return rows/);
    expect(fn).toContain("percentFromQlcvChecklist");
    expect(fn).toContain("throw new Error(formatQlcvDbError");
  });
});
