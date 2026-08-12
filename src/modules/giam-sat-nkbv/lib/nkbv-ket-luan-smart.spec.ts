import { describe, expect, it } from "vitest";
import {
  collectRitPathogens,
  detectSecondaryBsiFromSbap,
  formatBaKetLuanProgressive,
  formatBaKetLuanSummary,
  mergePathogenLists,
  scanIndexPriorRitAlert,
} from "./nkbv-ket-luan-smart";
import { computeBaGridSession } from "./nkbv-ba-grid-engine";

describe("nkbv-ket-luan-smart", () => {
  it("collectRitPathogens gộp VK cùng loại trong RIT, bỏ âm tính và máu (site)", () => {
    const pathogens = collectRitPathogens({
      nsk: "2026-07-20",
      majorType: "UTI",
      xn: [
        {
          id: "u1",
          ngay: "2026-07-20",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          source: "LIS",
        },
        {
          id: "u2",
          ngay: "2026-07-25",
          benh_pham: "Nước tiểu",
          vi_khuan: "K. pneumoniae",
          source: "LIS",
        },
        {
          id: "u3",
          ngay: "2026-07-22",
          benh_pham: "Nước tiểu",
          vi_khuan: "âm tính",
          source: "LIS",
        },
        {
          id: "b1",
          ngay: "2026-07-21",
          benh_pham: "Máu",
          vi_khuan: "E. coli",
          source: "LIS",
        },
        {
          id: "late",
          ngay: "2026-08-10",
          benh_pham: "Nước tiểu",
          vi_khuan: "P. aeruginosa",
          source: "LIS",
        },
      ],
    });
    expect(pathogens).toEqual(["E. coli", "K. pneumoniae"]);
  });

  it("detectSecondaryBsiFromSbap khớp máu–nước tiểu trong SBAP", () => {
    const r = detectSecondaryBsiFromSbap({
      primarySite: "UTI",
      sbapStart: "2026-07-17",
      sbapEnd: "2026-08-02",
      primaryOrganisms: ["E. coli"],
      xn: [
        {
          id: "b1",
          ngay: "2026-07-22",
          benh_pham: "Máu",
          vi_khuan: "E. coli",
          source: "LIS",
        },
        {
          id: "b2",
          ngay: "2026-07-22",
          benh_pham: "Máu",
          vi_khuan: "Candida albicans",
          source: "LIS",
        },
      ],
    });
    expect(r.isSecondary).toBe(true);
    expect(r.matchedBloodIds).toContain("b1");
    expect(r.matchedBloodIds).not.toContain("b2");
    expect(r.bloodOrganisms).toEqual(["E. coli"]);
  });

  it("formatBaKetLuanSummary đúng thứ tự 5 ý + Secondary", () => {
    const s = formatBaKetLuanSummary({
      haiPoa: "HAI",
      loaiNk: "UTI",
      secondaryBsi: true,
      nsk: "2026-07-19",
      tacNhan: "E. coli; K. pneumoniae",
      noi: "A1",
    });
    expect(s).toBe(
      "HAI · UTI; Secondary BSI · NSK 19/7 · E. coli; K. pneumoniae · A1",
    );
  });

  it("formatBaKetLuanProgressive ưu tiên verdict, không gắn NSK", () => {
    expect(
      formatBaKetLuanProgressive({
        indexDate: "2026-07-19",
        verdictLabel: "NO_EVENT · thiếu triệu chứng",
      }),
    ).toBe("NO_EVENT · thiếu triệu chứng");
    expect(
      formatBaKetLuanProgressive({
        indexDate: "2026-07-19",
        tacNhanHint: "K. pneumoniae",
      }),
    ).toMatch(/Chưa đủ TC · Index 19\/7 · K\. pneumoniae/);
    expect(
      formatBaKetLuanProgressive({ indexDate: "2026-07-19" }),
    ).not.toMatch(/NSK /);
  });

  it("mergePathogenLists dedupe", () => {
    expect(mergePathogenLists(["E. coli"], ["E. coli", "K. pneumoniae"])).toBe(
      "E. coli; K. pneumoniae",
    );
  });

  it("scanIndexPriorRitAlert cảnh báo mềm khi Index ∈ RIT ca trước", () => {
    const alert = scanIndexPriorRitAlert({
      maBenhAn: "BA1",
      indexDate: "2026-07-25",
      loaiBenhPham: "Nước tiểu",
      existingEvents: [
        {
          id: "ev1",
          ma_benh_an: "BA1",
          ngay_phat_hien: "2026-07-20",
          loai_ma: "UTI",
          vi_tri_nhiem_khuan: "UTI",
        },
      ],
    });
    expect(alert?.code).toBe("RIT");
    expect(alert?.message).toMatch(/khung sự kiện trước/i);
  });

  it("computeBaGridSession: gộp RIT + Secondary vào kết luận", () => {
    const session = computeBaGridSession({
      ngayVaoVien: "2026-07-17",
      xn: [
        {
          id: "urine-1",
          ngay: "2026-07-20",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          so_luong: "10^5",
          source: "LIS",
        },
        {
          id: "urine-2",
          ngay: "2026-07-28",
          benh_pham: "Nước tiểu",
          vi_khuan: "K. pneumoniae",
          source: "LIS",
        },
        {
          id: "blood-1",
          ngay: "2026-07-22",
          benh_pham: "Máu",
          vi_khuan: "E. coli",
          source: "LIS",
        },
      ],
      cdha: [],
      activeIndex: { kind: "XN", id: "urine-1", date: "2026-07-20" },
      nghiNgo: "UTI",
      symptomDates: {},
      tieuChuanByDate: {
        "2026-07-19": [{ key: "fever", label: "Sốt" }],
      },
      khoaByDate: { "2026-07-19": "A1" },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      criteriaMetPreview: true,
    });
    expect(session.nsk).toBe("2026-07-19");
    expect(session.ketLuan?.tac_nhan).toMatch(/E\. coli/);
    expect(session.ketLuan?.tac_nhan).toMatch(/K\. pneumoniae/);
    expect(session.ketLuan?.is_secondary_bsi).toBe(true);
    expect(session.ketLuan?.suggestedSummary.startsWith("HAI") || session.ketLuan?.suggestedSummary.startsWith("POA")).toBe(
      true,
    );
    expect(session.ketLuan?.suggestedSummary).toMatch(/Secondary BSI/);
    expect(session.ketLuan?.suggestedSummary).toMatch(/NSK/);
    expect(session.ketLuan?.suggestedSummary).toMatch(/A1/);
  });
});
