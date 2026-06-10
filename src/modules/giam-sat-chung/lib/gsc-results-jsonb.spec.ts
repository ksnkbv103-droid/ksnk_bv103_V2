import { describe, expect, it } from "vitest";
import { parseGscResultsJsonb } from "./gsc-results-jsonb";

describe("parseGscResultsJsonb", () => {
  it("parses array rows with snake_case keys", () => {
    const rows = parseGscResultsJsonb([
      { criterion_id: "c1", value: "DAT", note: "ok", weight_type: "MAJOR", is_red_flag: false },
    ]);
    expect(rows).toEqual([
      {
        criterion_id: "c1",
        value: "DAT",
        note: "ok",
        weight_type: "MAJOR",
        is_red_flag: false,
        image_url: null,
        thoi_diem_ghi: null,
        gia_tri_so: null,
        gia_tri_lua_chon: null,
      },
    ]);
  });

  it("accepts camelCase criterionId from legacy payloads", () => {
    const rows = parseGscResultsJsonb([{ criterionId: "c2", value: "KHONG_DAT" }]);
    expect(rows[0]?.criterion_id).toBe("c2");
    expect(rows[0]?.value).toBe("KHONG_DAT");
  });

  it("returns empty for invalid JSON string", () => {
    expect(parseGscResultsJsonb("{bad")).toEqual([]);
  });
});
