import { describe, expect, it } from "vitest";
import { buildVeSinhTayKpiCards } from "./ve-sinh-tay-kpi";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

function minimalVst(over: Partial<VstStrategicPayload["kpis"]> = {}): VstStrategicPayload {
  return {
    kpis: {
      tong_phien: 1,
      tong_co_hoi: 10,
      da_tuan_thu: 8,
      ty_le_tuan_thu: 80,
      ty_le_dung_ky_thuat: 0,
      ty_le_lam_dung_gang: 0,
      ...over,
    },
    trendline: [],
    matrix_khoa: [],
    matrix_nghe: [],
    moments: [],
    gap_analysis: [],
    workload: {
      khoa_tu_giam_sat: 0,
      khoa_duoc_ksnk_giam_sat: 0,
      ksnk_so_co_hoi: 0,
      ksnk_so_phien: 0,
      co_cau_giam_sat: [],
    },
  } as VstStrategicPayload;
}

function minimalGsc(): GscStrategicPayload {
  return {
    kpis: { tong_phien: 3, tong_quan_sat: 20, tong_dat: 15, tong_vi_pham: 5, ty_le_tuan_thu: 75 },
    trendline: [],
    matrix_khoa: [],
    top_violations: [],
    gap_analysis: [],
    dynamic_checklists: [
      {
        // short form — pickBkRow resolves via alias to catalogMaBk long
        ma_bk: "BM.07.02",
        ten_bang_kiem: "VST TQ",
        tong_phien: 2,
        tong_quan_sat: 10,
        tong_dat: 9,
        tong_vi_pham: 1,
        ty_le_tuan_thu: 90,
      },
      {
        ma_bk: "BM.08.01",
        ten_bang_kiem: "PPE",
        tong_phien: 1,
        tong_quan_sat: 10,
        tong_dat: 6,
        tong_vi_pham: 4,
        ty_le_tuan_thu: 60,
      },
    ],
    workload: {
      khoa_tu_giam_sat: 0,
      khoa_duoc_ksnk_giam_sat: 0,
      chuyen_de_duoc_ksnk_phu: 0,
      ksnk_so_phien: 0,
      co_cau_giam_sat: [],
    },
  } as GscStrategicPayload;
}

describe("buildVeSinhTayKpiCards", () => {
  it("returns 3 cards without merging percents", () => {
    const cards = buildVeSinhTayKpiCards({ vst: minimalVst(), gsc: minimalGsc() });
    expect(cards).toHaveLength(3);
    expect(cards[0]!.tyLe).toBe(80);
    expect(cards[1]!.catalogMaBk).toBe("KSNK.QT.07.BM.02");
    expect(cards[1]!.tyLe).toBe(90);
    expect(cards[2]!.catalogMaBk).toBe("KSNK.QT.07.BM.03");
    expect(cards[2]!.tyLe).toBeNull();
    expect(cards[1]!.statsHref).toContain("bk=KSNK.QT.07.BM.02");
  });

  it("giữ kỳ lọc bản ký trên deep-link thống kê", () => {
    const cards = buildVeSinhTayKpiCards({
      vst: minimalVst(),
      gsc: minimalGsc(),
      filters: { tu_ngay: "2026-09-01", den_ngay: "2026-09-28", khoa_ids: ["k1"] },
    });
    expect(cards[0]!.statsHref).toContain("/thong-ke/vst?");
    expect(cards[0]!.statsHref).toContain("tu_ngay=2026-09-01");
    expect(cards[0]!.statsHref).toContain("khoa_ids=k1");
    expect(cards[1]!.statsHref).toContain("bk=KSNK.QT.07.BM.02");
    expect(cards[1]!.statsHref).toContain("den_ngay=2026-09-28");
  });

  it("handles missing payloads", () => {
    const cards = buildVeSinhTayKpiCards({ vst: null, gsc: null });
    expect(cards.every((c) => c.tyLe == null)).toBe(true);
  });

  it("matches overview row when payload uses prod long ma_bk", () => {
    const gsc = minimalGsc();
    gsc.dynamic_checklists = [
      {
        ma_bk: "KSNK.QT.07.BM.02",
        ten_bang_kiem: "VST TQ",
        tong_phien: 1,
        tong_quan_sat: 5,
        tong_dat: 4,
        tong_vi_pham: 1,
        ty_le_tuan_thu: 80,
      },
    ];
    const cards = buildVeSinhTayKpiCards({ vst: minimalVst(), gsc });
    expect(cards[1]!.tyLe).toBe(80);
  });

  it("VST-04: thẻ BM.03 cộng mọi BK cùng nhóm alias short+dài", () => {
    const gsc = {
      checklist_overview: [
        {
          ma_bk: "BM.07.03",
          ten_bang_kiem: "short",
          tong_phien: 1,
          tong_quan_sat: 8,
          tong_dat: 8,
          tong_vi_pham: 0,
          ty_le_tuan_thu: 100,
        },
        {
          ma_bk: "KSNK.QT.07.BM.03",
          ten_bang_kiem: "long",
          tong_phien: 1,
          tong_quan_sat: 10,
          tong_dat: 5,
          tong_vi_pham: 5,
          ty_le_tuan_thu: 50,
        },
      ],
    } as unknown as GscStrategicPayload;
    const cards = buildVeSinhTayKpiCards({ vst: null, gsc });
    const bm03 = cards.find((c) => c.qtMa === "BM.03");
    expect(bm03?.volumeNote).toContain("2 phiên");
    expect(bm03?.tyLe).toBe(72.22);
  });
});
