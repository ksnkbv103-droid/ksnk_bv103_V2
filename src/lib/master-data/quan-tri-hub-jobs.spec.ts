import { describe, expect, it } from "vitest";
import { isDefaultVisibleHubRow, visibleHubRows } from "./quan-tri-hub-jobs";
import type { DanhMucHubRow } from "./danh-muc-hub-catalog";

function row(partial: Partial<DanhMucHubRow> & Pick<DanhMucHubRow, "id" | "name" | "path">): DanhMucHubRow {
  return {
    domain: "MDM",
    group: "to-chuc",
    tier: "lookup",
    ...partial,
  };
}

describe("visibleHubRows", () => {
  const tram = row({
    id: "TRAM_CSSD",
    name: "Trạm workflow CSSD",
    path: "/quan-tri-he-thong/danh-muc/chuyen-biet/TRAM_CSSD",
    loaiDanhMuc: "TRAM_CSSD",
    domain: "CSSD",
    group: "cssd",
  });
  const khoa = row({
    id: "khoa",
    name: "Khoa phòng",
    path: "/quan-tri-he-thong/danh-muc/khoa-phong",
    tier: "dedicated",
  });

  it("ẩn danh mục máy khi không tìm", () => {
    expect(isDefaultVisibleHubRow(tram)).toBe(false);
    expect(visibleHubRows([khoa, tram], "")).toEqual([khoa]);
  });

  it("tìm vẫn ra danh mục ẩn", () => {
    const found = visibleHubRows([khoa, tram], "trạm");
    expect(found.map((r) => r.id)).toContain("TRAM_CSSD");
  });
});
