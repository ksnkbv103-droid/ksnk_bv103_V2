import { describe, expect, it } from "vitest";
import { buildGscBangKiemSnapshotFromLiveRow } from "./gsc-bang-kiem-snapshot";
import {
  pickTieuChiJsonbForGscSession,
  scoredCriterionIdsFromGscResults,
} from "./gsc-session-criteria-hydrate";

const live = [
  { id: "old", noi_dung: "Câu cũ", stt: 1, is_active: false },
  { id: "keep", noi_dung: "Câu đang dùng", stt: 2, is_active: true },
  { id: "added", noi_dung: "Câu mới trên mẫu", stt: 3, is_active: true },
];

describe("gsc-session-criteria-hydrate", () => {
  it("reads scored ids from snake or camel results", () => {
    expect(
      scoredCriterionIdsFromGscResults([
        { criterion_id: "a" },
        { criterionId: "b" },
        { criterion_id: "a" },
      ]),
    ).toEqual(["a", "b"]);
  });

  it("uses frozen snapshot and ignores live extras", () => {
    const frozen = buildGscBangKiemSnapshotFromLiveRow(
      {
        id: "bk-1",
        ma_bk: "BM.01",
        ten_bang_kiem: "Mẫu",
        tieu_chi_jsonb: [
          { id: "keep", noi_dung: "Lúc chốt", stt: 1, is_active: true },
        ],
      },
      "2026-01-01T00:00:00.000Z",
    );
    const picked = pickTieuChiJsonbForGscSession({
      frozen,
      live,
      scoredCriterionIds: ["keep", "added"],
    });
    expect(picked.map((t) => t.id)).toEqual(["keep"]);
    expect(picked[0]?.noi_dung).toBe("Lúc chốt");
  });

  it("legacy phiếu: only scored questions, including inactive, not new live ones", () => {
    const picked = pickTieuChiJsonbForGscSession({
      frozen: null,
      live,
      scoredCriterionIds: ["old", "keep"],
    });
    expect(picked.map((t) => t.id)).toEqual(["old", "keep"]);
  });

  it("no scores (phiếu mới / rỗng): same active-only filter as form chọn mẫu", () => {
    const picked = pickTieuChiJsonbForGscSession({
      frozen: null,
      live,
      scoredCriterionIds: [],
    });
    expect(picked.map((t) => t.id)).toEqual(["keep", "added"]);
  });

  it("keeps a stub when scored id vanished from the live template", () => {
    const picked = pickTieuChiJsonbForGscSession({
      frozen: null,
      live,
      scoredCriterionIds: ["gone"],
    });
    expect(picked).toHaveLength(1);
    expect(picked[0]?.id).toBe("gone");
    expect(String(picked[0]?.noi_dung)).toContain("không còn");
  });
});
