import { describe, expect, it } from "vitest";
import { buildLockedTemplateMapping } from "@/lib/import-export-template";
import { DM_TABLE_BY_LOAI } from "./import-ma-utils";

describe("DM-4 — cột Excel loại dụng cụ", () => {
  it("tra danh mục loại dụng cụ theo cột vật lý ma_loai/ten_loai", () => {
    expect(DM_TABLE_BY_LOAI.LOAI_DUNG_CU).toEqual({
      table: "cssd_dm_loai_dung_cu",
      ma: "ma_loai",
      ten: "ten_loai",
    });
  });

  it("template Excel khóa alias UI, không đưa cột vật lý", () => {
    const mapping = buildLockedTemplateMapping({
      tableName: "cssd_dm_loai_dung_cu",
      uniqueKey: "ma_loai_dung_cu",
      baseMapping: {
        "Mã Loại": "ma_loai_dung_cu",
        "Tên Loại": "ten_loai_dung_cu",
      },
      data: [{ ma_loai: "X", ten_loai: "Y", ma_loai_dung_cu: "X", ten_loai_dung_cu: "Y" }],
    });
    const fields = Object.values(mapping);
    expect(fields).toContain("ma_loai_dung_cu");
    expect(fields).toContain("ten_loai_dung_cu");
    expect(fields).not.toContain("ma_loai");
    expect(fields).not.toContain("ten_loai");
  });
});
