import { describe, expect, it } from "vitest";
import {
  buildCriteriaGatePreview,
  buildPostEventAdminPreview,
  mergeBaTimelineMilestones,
  mapSpecimenToGate,
} from "./nkbv-ba-timeline-core";

describe("mapSpecimenToGate", () => {
  it("nước tiểu → UTI", () => {
    expect(mapSpecimenToGate({ loai_benh_pham: "Nước tiểu" })).toBe("UTI");
  });
  it("máu → BSI", () => {
    expect(mapSpecimenToGate({ loai_benh_pham: "Máu" })).toBe("BSI");
  });
  it("imaging → HAP", () => {
    expect(mapSpecimenToGate({ milestone_kind: "IMAGING_CHEST" })).toBe("HAP");
  });
});

describe("mergeBaTimelineMilestones", () => {
  it("bỏ XN âm tính; giữ dương tính + so_luong", () => {
    const rows = mergeBaTimelineMilestones({
      lis: [
        {
          id: "neg",
          ngay_lay_mau: "2026-05-21",
          loai_benh_pham: "Máu",
          tac_nhan: null,
          ket_qua_phan_loai: "AM_TINH",
          ket_qua_duong_tinh: false,
        },
        {
          id: "pos",
          ngay_lay_mau: "2026-05-21",
          loai_benh_pham: "Đờm",
          tac_nhan: "P. aeruginosa",
          so_luong: "10^5",
          ket_qua_phan_loai: "DUONG_TINH",
          ket_qua_duong_tinh: true,
        },
      ],
      manual: [],
      devices: [],
      hasActiveVent: false,
    });
    expect(rows.filter((r) => r.source === "LIS")).toHaveLength(1);
    expect(rows[0].so_luong).toBe("10^5");
    expect(rows[0].detail).toContain("SL 10^5");
  });

  it("sắp xếp đầu → cuối theo ngày", () => {
    const rows = mergeBaTimelineMilestones({
      lis: [
        {
          id: "2",
          ngay_lay_mau: "2026-05-22",
          loai_benh_pham: "Máu",
          tac_nhan: "E. coli",
          ket_qua_duong_tinh: true,
        },
        {
          id: "1",
          ngay_lay_mau: "2026-05-20",
          loai_benh_pham: "Nước tiểu",
          tac_nhan: "E. coli",
          ket_qua_duong_tinh: true,
        },
      ],
      manual: [
        {
          id: "x",
          milestone_kind: "IMAGING_CHEST",
          milestone_date: "2026-05-21",
          title: "XQ phổi thâm nhiễm",
          detail: null,
          specimen_hint: null,
          criteria_key: "imaging_chest",
        },
      ],
      devices: [],
      hasActiveVent: false,
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-05-20", "2026-05-21", "2026-05-22"]);
    expect(rows[1].criteriaKey).toBe("imaging_chest");
  });
});

describe("buildCriteriaGatePreview", () => {
  it("cổng PNEU hiện đủ tiêu chuẩn; XQ trên timeline = PRESENT", () => {
    const sputum = {
      id: "lis:1",
      source: "LIS" as const,
      date: "2026-05-20",
      kind: "LIS",
      title: "Đờm",
      detail: null,
      loai_benh_pham: "Đờm",
      tac_nhan: "K. pneumoniae",
      majorType: "PNEU" as const,
      gate: "HAP" as const,
    };
    const imaging = {
      id: "manual:x",
      source: "MANUAL" as const,
      date: "2026-05-21",
      kind: "IMAGING_CHEST",
      title: "XQ/CT phổi thâm nhiễm",
      detail: null,
      criteriaKey: "imaging_chest" as const,
      majorType: "PNEU" as const,
      gate: "HAP" as const,
    };
    const preview = buildCriteriaGatePreview({
      milestone: sputum,
      allMilestones: [sputum, imaging],
      admissionDate: "2026-05-15",
      hasActiveVent: false,
      siteEventsForSbap: [],
    });
    expect(preview?.gate).toBe("HAP");
    expect(preview?.criteriaRows.length).toBeGreaterThan(5);
    expect(preview?.criteriaRows.find((r) => r.key === "imaging_chest")?.status).toBe("PRESENT");
  });

  it("UTI nấm → không mở form", () => {
    const m = {
      id: "lis:1",
      source: "LIS" as const,
      date: "2026-05-20",
      kind: "LIS",
      title: "Nước tiểu",
      detail: null,
      loai_benh_pham: "Nước tiểu",
      tac_nhan: "Candida albicans",
      majorType: "UTI" as const,
      gate: "UTI" as const,
    };
    const preview = buildCriteriaGatePreview({
      milestone: m,
      allMilestones: [m],
      admissionDate: "2026-05-15",
      hasActiveVent: false,
      siteEventsForSbap: [],
    });
    expect(preview?.enoughToOpenForm).toBe(false);
  });
});

describe("buildPostEventAdminPreview", () => {
  it("POA/HAI + gợi ý Secondary sau sự kiện UTI", () => {
    const post = buildPostEventAdminPreview({
      caseRow: {
        id: "c1",
        loai_ma: "UTI",
        doe: "2026-05-20",
        ngay_phat_hien: "2026-05-20",
        tac_nhan: "Klebsiella pneumoniae",
      },
      admissionDate: "2026-05-15",
      bloodMilestones: [
        {
          id: "lis:b",
          source: "LIS",
          date: "2026-05-22",
          kind: "LIS",
          title: "Máu",
          detail: null,
          tac_nhan: "Klebsiella pneumoniae",
          majorType: "BSI",
          gate: "BSI",
        },
      ],
      devices: [],
    });
    expect(post?.poaHai).toBe("HAI");
    expect(post?.secondarySuggestions[0]?.isSecondary).toBe(true);
  });
});
