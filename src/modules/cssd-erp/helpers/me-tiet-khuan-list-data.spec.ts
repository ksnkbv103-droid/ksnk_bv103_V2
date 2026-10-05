import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("fetchBatchesAndMachines — đếm so_bo_trong_me", () => {
  it("chia cụm .in() và đọc hết trang quy_trinh theo helper fetchAllByIdChunks", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/cssd-erp/helpers/me-tiet-khuan-list-data.ts"),
      "utf8",
    );
    const start = src.indexOf("export async function fetchBatchesAndMachines");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start);
    const countBlock = fn.slice(
      fn.indexOf("const ids = raw.map"),
      fn.indexOf("const batchRows = raw.map"),
    );
    expect(countBlock).toContain("fetchAllByIdChunks");
    expect(countBlock).toContain('.in("lo_tiet_khuan_id", idChunk)');
    expect(countBlock).toContain(".range(");
    expect(countBlock).toContain('.order("lo_tiet_khuan_id"');
    expect(countBlock).toContain('.order("id"');
    expect(countBlock).not.toContain(".limit(");
    // Không còn .in() một phát trên toàn bộ ids (cắt URL / trang mặc định).
    expect(countBlock).not.toMatch(/\.in\(\s*"lo_tiet_khuan_id"\s*,\s*ids\s*\)/);
  });
});
