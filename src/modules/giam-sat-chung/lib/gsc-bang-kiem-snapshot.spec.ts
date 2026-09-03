import { describe, expect, it } from "vitest";
import {
  activeSortedTieuChiJsonb,
  buildGscBangKiemSnapshotFromLiveRow,
  checklistTemplateFromGscBangKiemSnapshot,
  parseGscBangKiemSnapshot,
  pickGscBangKiemSnapshotForSave,
} from "./gsc-bang-kiem-snapshot";

const liveRow = {
  id: "bk-1",
  ma_bk: "BM.01",
  ten_bang_kiem: "Vệ sinh tay",
  loai_giam_sat: "TUAN_THU",
  cach_tinh_diem: "TY_LE",
  phien_ban: "1.0",
  tieu_chi_jsonb: [
    { id: "c2", noi_dung: "Câu 2", stt: 2, is_active: true },
    { id: "c1", noi_dung: "Câu 1", stt: 1, is_active: true },
    { id: "c0", noi_dung: "Ẩn", stt: 0, is_active: false },
  ],
};

describe("gsc-bang-kiem-snapshot", () => {
  it("keeps only active criteria, sorted by stt", () => {
    const rows = activeSortedTieuChiJsonb(liveRow.tieu_chi_jsonb);
    expect(rows.map((r) => r.id)).toEqual(["c1", "c2"]);
  });

  it("parses snapshot from metadata wrapper", () => {
    const snap = buildGscBangKiemSnapshotFromLiveRow(liveRow, "2026-08-25T03:00:00.000Z");
    expect(snap?.tieu_chi_jsonb).toHaveLength(2);
    const parsed = parseGscBangKiemSnapshot({ bang_kiem_snapshot: snap });
    expect(parsed?.bang_kiem_id).toBe("bk-1");
    expect(parsed?.tieu_chi_jsonb.map((t) => t.id)).toEqual(["c1", "c2"]);
  });

  it("keeps frozen snapshot when same bảng kiểm is saved again", () => {
    const existing = buildGscBangKiemSnapshotFromLiveRow(liveRow, "2026-01-01T00:00:00.000Z");
    const liveNewer = buildGscBangKiemSnapshotFromLiveRow(
      {
        ...liveRow,
        tieu_chi_jsonb: [
          ...liveRow.tieu_chi_jsonb,
          { id: "c9", noi_dung: "Câu mới", stt: 9, is_active: true },
        ],
      },
      "2026-08-25T03:00:00.000Z",
    );
    const picked = pickGscBangKiemSnapshotForSave({
      bangKiemId: "bk-1",
      existing,
      live: liveNewer,
    });
    expect(picked?.chot_luc).toBe("2026-01-01T00:00:00.000Z");
    expect(picked?.tieu_chi_jsonb.map((t) => t.id)).toEqual(["c1", "c2"]);
  });

  it("takes live snapshot when bảng kiểm changed or first save", () => {
    const existing = buildGscBangKiemSnapshotFromLiveRow(liveRow, "2026-01-01T00:00:00.000Z");
    const liveOther = buildGscBangKiemSnapshotFromLiveRow(
      { ...liveRow, id: "bk-2", ma_bk: "BM.02", ten_bang_kiem: "Khác" },
      "2026-08-25T03:00:00.000Z",
    );
    const switched = pickGscBangKiemSnapshotForSave({
      bangKiemId: "bk-2",
      existing,
      live: liveOther,
    });
    expect(switched?.bang_kiem_id).toBe("bk-2");
    expect(switched?.ten_bang_kiem).toBe("Khác");

    const firstSave = pickGscBangKiemSnapshotForSave({
      bangKiemId: "bk-1",
      existing: null,
      live: existing,
    });
    expect(firstSave?.bang_kiem_id).toBe("bk-1");
  });

  it("hydrates form template from snapshot, not live extras", () => {
    const snap = buildGscBangKiemSnapshotFromLiveRow(liveRow, "2026-08-25T03:00:00.000Z");
    expect(snap).not.toBeNull();
    const template = checklistTemplateFromGscBangKiemSnapshot(snap!);
    expect(template.criteria.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(template.criteria.map((c) => c.label)).toEqual(["Câu 1", "Câu 2"]);
    expect(template.cach_tinh_diem).toBe("TY_LE");
    expect(template.loai_giam_sat).toBe("TUAN_THU");
  });

  it("returns null when snapshot payload is incomplete", () => {
    expect(parseGscBangKiemSnapshot(null)).toBeNull();
    expect(parseGscBangKiemSnapshot({ tieu_chi_jsonb: [] })).toBeNull();
    expect(parseGscBangKiemSnapshot({ bang_kiem_id: "bk-1" })).toBeNull();
  });
});
