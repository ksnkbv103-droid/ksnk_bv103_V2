import { describe, expect, it } from "vitest";
import {
  evaluateSecondaryBsiForBloodAll,
  priorEventsToSecondarySites,
  resolveBelongsActiveSessionRit,
  resolveBelongsOpenSessionByDate,
  resolveDoeBelongsPriorEvent,
  resolveIndexEventDisposition,
  resolveInsufficientInLaterEventNote,
} from "./nkbv-index-event-disposition";
import { evaluateSecondaryBsiForBlood } from "./nkbv-secondary-bsi-gate";

describe("nkbv-index-event-disposition", () => {
  const priorPneu = {
    id: "ev-pneu",
    ngay_phat_hien: "2026-07-17",
    loai_ma: "PNEU",
    loai_ten: "PNU1 (HAP)",
    tac_nhan_vi_khuan: "K. pneumoniae",
    index_vi_sinh_id: "xn-dorm-1",
    attributed_vi_sinh_ids: ["xn-dorm-2"],
  };

  const priorUti = {
    id: "ev-uti",
    ngay_phat_hien: "2026-07-18",
    loai_ma: "UTI",
    loai_ten: "CAUTI",
    tac_nhan_vi_khuan: "E. coli",
    index_vi_sinh_id: "xn-nt-1",
  };

  it("đờm ∈ RIT PNEU trước → BELONGS_PRIOR_EVENT", () => {
    const d = resolveIndexEventDisposition({
      indexId: "xn-dorm-new",
      indexDate: "2026-07-22",
      specimenOrLabel: "Đờm",
      organism: "A. baumannii",
      priorEvents: [priorPneu],
    });
    expect(d.kind).toBe("BELONGS_PRIOR_EVENT");
    if (d.kind === "BELONGS_PRIOR_EVENT") {
      expect(d.priorEventId).toBe("ev-pneu");
      expect(d.ketLuanLabel).toMatch(/Thuộc SK DOE|đủ TC|RIT/i);
      expect(d.ketLuanLabel).toMatch(/RIT|DOE/);
    }
  });

  it("XQ phổi ∈ RIT PNEU → BELONGS_PRIOR_EVENT", () => {
    const d = resolveIndexEventDisposition({
      indexId: "cdha-1",
      indexDate: "2026-07-20",
      specimenOrLabel: "XQ thâm nhiễm",
      isImaging: true,
      priorEvents: [priorPneu],
    });
    expect(d.kind).toBe("BELONGS_PRIOR_EVENT");
  });

  it("XN đã DA_PHAN_TICH / attributed → BELONGS_PRIOR", () => {
    const d = resolveIndexEventDisposition({
      indexId: "lis:xn-dorm-2",
      indexDate: "2026-07-25",
      specimenOrLabel: "Đờm",
      priorEvents: [priorPneu],
      analysisDispositions: [
        {
          index_vi_sinh_id: "xn-dorm-2",
          analysis_disposition: "DA_PHAN_TICH",
          is_active: true,
        },
      ],
    });
    expect(d.kind).toBe("BELONGS_PRIOR_EVENT");
  });

  it("máu khớp UTI + PNEU SBAP → SECONDARY đa site", () => {
    const d = resolveIndexEventDisposition({
      indexId: "blood-1",
      indexDate: "2026-07-20",
      specimenOrLabel: "Máu",
      organism: "E. coli",
      priorEvents: [
        priorUti,
        { ...priorPneu, tac_nhan_vi_khuan: "E. coli" },
      ],
    });
    expect(d.kind).toBe("SECONDARY_BSI");
    if (d.kind === "SECONDARY_BSI") {
      expect(d.sites.length).toBeGreaterThanOrEqual(1);
      expect(d.ketLuanLabel).toMatch(/thứ phát.*sự kiện ngày/i);
    }
  });

  it("máu khớp cả UTI và PNEU → ≥2 site", () => {
    const sites = priorEventsToSecondarySites([
      priorUti,
      { ...priorPneu, tac_nhan_vi_khuan: "E. coli" },
    ]);
    const multi = evaluateSecondaryBsiForBloodAll({
      blood: { id: "b1", date: "2026-07-20", organism: "E. coli" },
      sites,
    });
    expect(multi.outcome).toBe("SECONDARY");
    expect(multi.hits.length).toBeGreaterThanOrEqual(2);
    const majors = multi.hits.map((h) => h.majorType).sort();
    expect(majors).toContain("UTI");
    expect(majors).toContain("PNEU");
  });

  it("gate evaluateSecondaryBsiForBlood thu thập allSites", () => {
    const sites = priorEventsToSecondarySites([
      priorUti,
      { ...priorPneu, tac_nhan_vi_khuan: "E. coli" },
    ]);
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "b1", date: "2026-07-20", organism: "E. coli" },
      sites,
    });
    expect(v.outcome).toBe("SECONDARY");
    expect((v.allSites || []).length).toBeGreaterThanOrEqual(2);
  });

  it("XN ∈ RIT phiên đang PT đủ TC → BELONGS session", () => {
    const d = resolveBelongsActiveSessionRit({
      sampleId: "xn-dorm-2",
      kind: "XN",
      active: {
        indexId: "xn-dorm-1",
        doe: "2026-07-17",
        loaiLabel: "PNU1 (HAP)",
        majorType: "PNEU",
        ritXnIds: ["xn-dorm-2"],
        eventEstablished: true,
      },
    });
    expect(d?.kind).toBe("BELONGS_PRIOR_EVENT");
    expect(d?.priorLoai).toMatch(/PNU1|PNEU/);
    expect(d?.ketLuanLabel).toMatch(/Thuộc SK|RIT/);
  });

  it("phiên chưa đủ TC → không BELONGS session RIT", () => {
    const d = resolveBelongsActiveSessionRit({
      sampleId: "xn-dorm-2",
      kind: "XN",
      active: {
        indexId: "xn-dorm-1",
        doe: "2026-07-17",
        loaiLabel: "PNEU",
        majorType: "PNEU",
        ritXnIds: ["xn-dorm-2"],
        eventEstablished: false,
      },
    });
    expect(d).toBeNull();
  });

  it("chính Index không thuộc session RIT conclude", () => {
    const d = resolveBelongsActiveSessionRit({
      sampleId: "xn-dorm-1",
      kind: "XN",
      active: {
        indexId: "xn-dorm-1",
        doe: "2026-07-17",
        loaiLabel: "PNEU",
        majorType: "PNEU",
        ritXnIds: ["xn-dorm-1", "xn-dorm-2"],
        eventEstablished: true,
      },
    });
    expect(d).toBeNull();
  });

  it("XN ∈ RIT phiên UTI đủ TC → BELONGS (không mở IWP mới)", () => {
    const d = resolveBelongsOpenSessionByDate({
      sampleId: "xn-nt-2",
      sampleDate: "2026-07-27",
      sampleMajor: "UTI",
      sessions: [
        {
          id: "UTI:xn-nt-1",
          panel: "UTI",
          index: { id: "xn-nt-1", date: "2026-07-23" },
          indexLabel: "Nước tiểu · E. coli",
          doe: "2026-07-22",
          eventEstablished: true,
        },
      ],
    });
    expect(d?.kind).toBe("BELONGS_PRIOR_EVENT");
    expect(d?.priorDoe).toBe("2026-07-22");
    expect(d?.ketLuanLabel).toMatch(/không mở khung phân tích/);
  });

  it("phiên UTI chưa đủ TC → không khóa XN trong khung ngày", () => {
    const d = resolveBelongsOpenSessionByDate({
      sampleId: "xn-nt-2",
      sampleDate: "2026-07-27",
      sampleMajor: "UTI",
      sessions: [
        {
          id: "UTI:xn-nt-1",
          panel: "UTI",
          index: { id: "xn-nt-1", date: "2026-07-23" },
          doe: "2026-07-22",
          eventEstablished: false,
        },
      ],
    });
    expect(d).toBeNull();
  });

  it("KHONG_DU_TC → CLOSED_INSUFFICIENT (không khóa XN khác)", () => {
    const d = resolveIndexEventDisposition({
      indexId: "xn-nt-a",
      indexDate: "2026-07-20",
      specimenOrLabel: "Nước tiểu",
      priorEvents: [],
      analysisDispositions: [
        {
          index_vi_sinh_id: "xn-nt-a",
          analysis_disposition: "KHONG_DU_TC",
          is_active: true,
        },
      ],
    });
    expect(d.kind).toBe("CLOSED_INSUFFICIENT");
  });

  it("DOE ∈ RIT sự kiện UTI cũ → BELONGS khi đang phân tích XN ngoài RIT theo ngày mẫu", () => {
    const d = resolveDoeBelongsPriorEvent({
      doe: "2026-07-25",
      sampleMajor: "UTI",
      priorEvents: [priorUti],
    });
    expect(d?.kind).toBe("BELONGS_PRIOR_EVENT");
    expect(d?.priorEventId).toBe("ev-uti");
    expect(d?.ketLuanLabel).toMatch(/DOE ∈ RIT/);
  });

  it("DOE ngoài RIT PNEU → không BELONGS", () => {
    const d = resolveDoeBelongsPriorEvent({
      doe: "2026-08-05",
      sampleMajor: "PNEU",
      priorEvents: [priorPneu],
    });
    expect(d).toBeNull();
  });

  it("XN không đủ TC nằm trong RIT sự kiện sau → annotate", () => {
    const note = resolveInsufficientInLaterEventNote({
      sampleId: "xn-nt-a",
      sampleDate: "2026-07-20",
      sampleMajor: "UTI",
      analysisDispositions: [
        {
          index_vi_sinh_id: "xn-nt-a",
          analysis_disposition: "KHONG_DU_TC",
          is_active: true,
        },
      ],
      priorEvents: [priorUti],
    });
    expect(note).toMatch(/Nằm trong sự kiện/);
    expect(note).toMatch(/18\/7|CAUTI/);
  });

  it("máu ∈ RIT BSI trước → BELONGS (Primary)", () => {
    const d = resolveIndexEventDisposition({
      indexId: "blood-2",
      indexDate: "2026-07-22",
      specimenOrLabel: "Máu",
      organism: "S. aureus",
      priorEvents: [
        {
          id: "ev-bsi",
          ngay_phat_hien: "2026-07-18",
          loai_ma: "BSI",
          loai_ten: "CLABSI",
          index_vi_sinh_id: "blood-1",
          tac_nhan_vi_khuan: "S. aureus",
        },
      ],
    });
    expect(d.kind).toBe("BELONGS_PRIOR_EVENT");
    if (d.kind === "BELONGS_PRIOR_EVENT") {
      expect(d.majorType).toBe("BSI");
    }
  });

  it("máu khớp phiên UTI đủ TC (chưa chốt phiếu) → SECONDARY — không Primary", () => {
    const d = resolveIndexEventDisposition({
      indexId: "blood-open",
      indexDate: "2026-07-20",
      specimenOrLabel: "Máu",
      organism: "E. coli",
      priorEvents: [],
      openSiteSessions: [
        {
          id: "sess-uti",
          panel: "UTI",
          eventEstablished: true,
          indexDate: "2026-07-18",
          doe: "2026-07-18",
          siteOrganism: "E. coli",
        },
      ],
    });
    expect(d.kind).toBe("SECONDARY_BSI");
  });

  it("máu ngoài SBAP phiên site đủ TC → NEW_ANALYSIS (Primary được phép)", () => {
    const d = resolveIndexEventDisposition({
      indexId: "blood-out",
      indexDate: "2026-08-10",
      specimenOrLabel: "Máu",
      organism: "S. aureus",
      priorEvents: [],
      openSiteSessions: [
        {
          id: "sess-uti",
          panel: "UTI",
          eventEstablished: true,
          indexDate: "2026-07-18",
          doe: "2026-07-18",
          siteOrganism: "E. coli",
        },
      ],
    });
    expect(d.kind).toBe("NEW_ANALYSIS");
  });

  it("phiên site chưa đủ TC → không dựng SBAP → máu vẫn NEW_ANALYSIS", () => {
    const d = resolveIndexEventDisposition({
      indexId: "blood-early",
      indexDate: "2026-07-20",
      specimenOrLabel: "Máu",
      organism: "E. coli",
      priorEvents: [],
      openSiteSessions: [
        {
          id: "sess-uti",
          panel: "UTI",
          eventEstablished: false,
          indexDate: "2026-07-18",
          doe: null,
          siteOrganism: "E. coli",
        },
      ],
    });
    expect(d.kind).toBe("NEW_ANALYSIS");
  });
});
