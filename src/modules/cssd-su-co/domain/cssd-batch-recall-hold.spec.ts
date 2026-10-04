import { describe, expect, it } from "vitest";
import {
  buildBm01RecallTotals,
  isIssuedToWard,
  markHoldMemberReturned,
  mergeRecallIncidentAttributes,
  partitionRecallMembersTwoPhase,
  readRecallMemberJson,
  recallScopeFromBatchCount,
} from "./cssd-batch-recall-hold";

describe("partitionRecallMembersTwoPhase (SC-01)", () => {
  it("tách trong kho / đã cấp / đã dùng", () => {
    const split = partitionRecallMembersTwoPhase([
      { id: "b1", loId: "m1", maBo: "B01" },
      {
        id: "b2",
        loId: "m1",
        maBo: "B02",
        thoiGianCapPhat: "2026-10-01T08:00:00.000Z",
        khoaNhanId: "k1",
      },
      {
        id: "b3",
        loId: "m1",
        maBo: "B03",
        thoiGianCapPhat: "2026-10-01T09:00:00.000Z",
        khoaNhanId: "k2",
        usedClinically: true,
        usedClinicallyAt: "2026-10-01T10:00:00.000Z",
        usedClinicallyBy: "u1",
      },
    ]);
    expect(split.moveNow.map((x) => x.id)).toEqual(["b1"]);
    expect(split.holdPending.map((x) => x.id)).toEqual(["b2"]);
    expect(split.listedOnly.map((x) => x.id)).toEqual(["b3"]);
  });

  it("khoa_nhan không đủ — cần thoi_gian_cap_phat", () => {
    expect(isIssuedToWard({ khoaNhanId: "k1" })).toBe(false);
    expect(isIssuedToWard({ thoiGianCapPhat: "2026-10-01T00:00:00.000Z" })).toBe(true);
  });
});

describe("recall JSON + merge (SC-06/07)", () => {
  it("đọc mảng JSON có cấu trúc", () => {
    const rows = readRecallMemberJson([
      {
        quy_trinh_id: "q1",
        ma_bo: "B01",
        khoa_ten: "Khoa A",
        used_clinically_at: "2026-10-01T10:00:00.000Z",
        trang_thai: "USED",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toMatchObject({ maBo: "B01", khoaTen: "Khoa A", trangThai: "USED" });
  });

  it("merge giữ trạng thái xác nhận", () => {
    const next = mergeRecallIncidentAttributes(
      {
        INCIDENT_STATUS: "DA_XAC_NHAN",
        INCIDENT_CONFIRMED_BY_NAME: "Trưởng",
        NGUOI_PHAT_HIEN: "NV A",
        RECALL_BATCH_IDS: "m1",
      },
      {
        BATCH_RECALL: "1",
        RECALL_BATCH_IDS: "m2",
        INCIDENT_STATUS: "OPEN",
      },
    );
    expect(next.INCIDENT_STATUS).toBe("DA_XAC_NHAN");
    expect(next.INCIDENT_CONFIRMED_BY_NAME).toBe("Trưởng");
    expect(next.NGUOI_PHAT_HIEN).toBe("NV A");
    expect(String(next.RECALL_BATCH_IDS)).toMatch(/m1/);
    expect(String(next.RECALL_BATCH_IDS)).toMatch(/m2/);
  });

  it("đánh dấu đã thu về trong danh sách chờ", () => {
    const next = markHoldMemberReturned(
      [{ quyTrinhId: "q1", maBo: "B01", trangThai: "CHO_THU_VE" }],
      "q1",
      { newQuyTrinhId: "q2", nguoiNhanCssd: "CSSD" },
    );
    expect(next[0]?.trangThai).toBe("DA_THU_VE");
    expect(next[0]?.newQuyTrinhId).toBe("q2");
  });

  it("BM.01 tổng và scope", () => {
    expect(recallScopeFromBatchCount(3)).toBe("MULTI_BATCH");
    expect(buildBm01RecallTotals({ issuedCount: 2, returnedCount: 1, usedCount: 1, pendingCount: 1 })).toEqual({
      xuat: 2,
      thuHoiDuoc: 1,
      thatLacHoacDaDung: 1,
      choThuVe: 1,
    });
  });
});
