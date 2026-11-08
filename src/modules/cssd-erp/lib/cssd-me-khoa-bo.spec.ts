import { describe, expect, it } from "vitest";
import { formatMeKhoaText, groupMeBoByKhoa, ME_KHOA_CHUA_CAP } from "./cssd-me-khoa-bo";

const rows = [
  { maBo: "B1", tenBo: "Bộ 1", khoaNhanId: "k2", khoaTen: "Phòng mổ 1" },
  { maBo: "B2", tenBo: "Bộ 2", khoaNhanId: null, khoaTen: null },
  { maBo: "B3", tenBo: "Bộ 3", khoaNhanId: "k1", khoaTen: "Khoa Ngoại" },
  { maBo: "B4", tenBo: "Bộ 4", khoaNhanId: "k2", khoaTen: "Phòng mổ 1" },
];

describe("groupMeBoByKhoa", () => {
  it("gom theo nơi nhận, chưa cấp xếp cuối", () => {
    const g = groupMeBoByKhoa(rows);
    expect(g.map((x) => x.khoaTen)).toEqual(["Khoa Ngoại", "Phòng mổ 1", ME_KHOA_CHUA_CAP]);
    expect(g[1].bo.map((b) => b.maBo)).toEqual(["B1", "B4"]);
  });
  it("định dạng văn bản để sao chép", () => {
    expect(formatMeKhoaText("L1", groupMeBoByKhoa(rows))).toBe(
      "Mẻ L1\nKhoa Ngoại (1 bộ): B3\nPhòng mổ 1 (2 bộ): B1, B4\nChưa cấp phát (1 bộ): B2",
    );
  });
});
