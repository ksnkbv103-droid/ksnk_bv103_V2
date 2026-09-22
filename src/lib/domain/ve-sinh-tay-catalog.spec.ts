import { describe, expect, it } from "vitest";
import {
  findVeSinhTayEntryByCatalogMa,
  gscHrefForVeSinhTayBk,
  VE_SINH_TAY_ENTRIES,
  VE_SINH_TAY_GSC_MA_BK,
} from "./ve-sinh-tay-catalog";

describe("ve-sinh-tay-catalog", () => {
  it("exposes exactly 3 entries — WHO + BM.07.02 + BM.07.03", () => {
    expect(VE_SINH_TAY_ENTRIES).toHaveLength(3);
    expect(VE_SINH_TAY_ENTRIES.map((e) => e.qtMa)).toEqual(["BM.01", "BM.02", "BM.03"]);
    expect(VE_SINH_TAY_ENTRIES[0]!.kind).toBe("who");
    expect(VE_SINH_TAY_ENTRIES[0]!.href).toBe("/giam-sat-vst");
    expect(VE_SINH_TAY_ENTRIES[0]!.catalogMaBk).toBeNull();
  });

  it("maps QT BM.02/BM.03 to seeded catalog codes", () => {
    expect(VE_SINH_TAY_GSC_MA_BK).toEqual(["BM.07.02", "BM.07.03"]);
    expect(VE_SINH_TAY_ENTRIES[1]!.href).toContain("bk=BM.07.02");
    expect(VE_SINH_TAY_ENTRIES[2]!.href).toContain("bk=BM.07.03");
  });

  it("builds GSC preselect href and finds by catalog ma", () => {
    expect(gscHrefForVeSinhTayBk("BM.07.02")).toBe("/giam-sat-chung/tuan-thu?bk=BM.07.02");
    expect(findVeSinhTayEntryByCatalogMa("bm.07.03")?.qtMa).toBe("BM.03");
    expect(findVeSinhTayEntryByCatalogMa("BM.99")).toBeUndefined();
  });
});
