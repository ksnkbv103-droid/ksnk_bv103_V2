import { describe, expect, it } from "vitest";
import {
  metadataWithoutCaseAnalysisStamp,
  shouldReleaseDaPhanTichOnHide,
  viSinhIdsLinkedOnCase,
} from "./nkbv-hide-case-vi-sinh";

const CASE = "case-1";

describe("viSinhIdsLinkedOnCase", () => {
  it("gom index và attributed, bỏ tiền tố lis:", () => {
    expect(
      viSinhIdsLinkedOnCase({
        index_vi_sinh_id: "lis:aaa",
        attributed_vi_sinh_ids: ["aaa", "bbb", "lis:ccc"],
      }),
    ).toEqual(["aaa", "bbb", "ccc"]);
  });
});

describe("shouldReleaseDaPhanTichOnHide", () => {
  it("gỡ khi phiếu này đóng dấu và không phiếu khác giữ XN", () => {
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "DA_PHAN_TICH", analyzed_case_id: CASE },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: false,
      }),
    ).toBe(true);
  });

  it("gỡ dấu cũ không có analyzed_case_id", () => {
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "DA_PHAN_TICH" },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: false,
      }),
    ).toBe(true);
  });

  it("giữ khi phiếu khác còn gắn XN", () => {
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "DA_PHAN_TICH", analyzed_case_id: CASE },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: true,
      }),
    ).toBe(false);
  });

  it("không đụng bỏ qua, không đủ TC, hay dấu của phiếu khác", () => {
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "BO_QUA", analyzed_case_id: CASE },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: false,
      }),
    ).toBe(false);
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "KHONG_DU_TC" },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: false,
      }),
    ).toBe(false);
    expect(
      shouldReleaseDaPhanTichOnHide({
        metadata: { analysis_disposition: "DA_PHAN_TICH", analyzed_case_id: "case-2" },
        hiddenCaseId: CASE,
        stillClaimedByOtherActiveCase: false,
      }),
    ).toBe(false);
  });
});

describe("metadataWithoutCaseAnalysisStamp", () => {
  it("xóa disposition và mốc phiếu, giữ field khác", () => {
    expect(
      metadataWithoutCaseAnalysisStamp({
        analysis_disposition: "DA_PHAN_TICH",
        analyzed_case_id: CASE,
        analyzed_at: "2026-09-01",
        nguon: "LIS",
      }),
    ).toEqual({ nguon: "LIS" });
  });
});
