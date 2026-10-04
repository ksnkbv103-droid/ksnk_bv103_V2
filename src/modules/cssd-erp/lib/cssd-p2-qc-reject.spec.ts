import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CSSD-07/08/10 P2", () => {
  it("Kiểm bộ có nút Trả về Làm sạch; không còn trạm gợi ý / jargon Spaulding cũ", () => {
    const waiting = readFileSync("src/modules/cssd-erp/components/waiting-list/WaitingList.tsx", "utf8");
    const packaging = readFileSync("src/lib/domain/cssd-packaging-rules.ts", "utf8");
    const loaiMap = readFileSync("src/lib/master-data/cssd-loai-dung-cu-map.ts", "utf8");
    const form = readFileSync(
      "src/modules/quan-tri-he-thong/danh-muc/dung-cu/loai-dung-cu-form-modal.tsx",
      "utf8",
    );
    expect(waiting).toMatch(/Trả về Làm sạch/);
    expect(waiting).toMatch(/currentStation === "QC"/);
    expect(packaging).toMatch(/Thiết yếu/);
    expect(packaging).not.toMatch(/Cực kỳ nguy hiểm/);
    expect(packaging).toMatch(/không chịu nhiệt/);
    expect(loaiMap).toMatch(/suggestCssdSterileMethodFromMaster/);
    expect(form).toMatch(/Gợi ý PP tiệt khuẩn chỉ định/);
    expect(form).not.toMatch(/Gợi ý trạm CSSD/);
  });
});
