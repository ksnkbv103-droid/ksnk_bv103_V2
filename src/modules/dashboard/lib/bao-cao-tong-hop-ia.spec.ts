import { describe, expect, it } from "vitest";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { composeBaoCaoTongHopPayload } from "./bao-cao-tong-hop-core";
import {
  BCTH_GSC_POOL_SURFACE,
  BCTH_MORE_SECTIONS,
  BCTH_PRIMARY_SECTIONS,
  BCTH_VST_KPI_FIELDS,
  BCTH_VST_KPI_SURFACE,
  bcthFrontProcessFields,
  bcthVstStatsHref,
  buildBcthVstKpiSlots,
  isGscPoolField,
} from "./bao-cao-tong-hop-ia";

describe("BCTH IA — 3 KPI VST tách pool GSC", () => {
  it("mục Vệ sinh tay là primary; Chuyên đề nằm trong Thêm", () => {
    const primary = BCTH_PRIMARY_SECTIONS.map((s) => s.id);
    const more = BCTH_MORE_SECTIONS.map((s) => s.id);
    expect(primary).toContain(BCTH_VST_KPI_SURFACE);
    expect(primary).toContain(BCTH_GSC_POOL_SURFACE);
    expect(more).not.toContain(BCTH_VST_KPI_SURFACE);
    expect(more).toContain("bc-chuyen-de");
  });

  it("mặt trước là 3 field VST, không ty_le_bk / ty_le_gsc", () => {
    expect([...bcthFrontProcessFields()]).toEqual([...BCTH_VST_KPI_FIELDS]);
    for (const field of bcthFrontProcessFields()) {
      expect(isGscPoolField(field)).toBe(false);
    }
    expect(isGscPoolField("ty_le_bk")).toBe(true);
    expect(isGscPoolField("ty_le_gsc")).toBe(true);
  });

  it("nhãn WHO phụ khác BM.02", () => {
    expect(PCT_SURFACE_LABEL.whoPhuDungKyThuat).toContain("ty_le_dung_ky_thuat");
    expect(PCT_SURFACE_LABEL.whoPhuDungKyThuat).not.toContain("ty_le_vst_ky_thuat");
    expect(PCT_SURFACE_LABEL.bm02KyThuat).toContain("ty_le_vst_ky_thuat");
    expect(PCT_SURFACE_LABEL.bm02KyThuat).not.toContain("ty_le_dung_ky_thuat");
    expect(PCT_SURFACE_LABEL.gscPool).toBe("pool GSC (mọi BK)");
  });

  it("deep-link từng khối: WHO, BM.07.02, BM.07.03", () => {
    expect(bcthVstStatsHref("who", null)).toBe("/thong-ke/vst");
    expect(bcthVstStatsHref("bm02", null)).toBe("/thong-ke/gsc?bk=BM.07.02");
    expect(bcthVstStatsHref("bm03", null)).toBe("/thong-ke/gsc?bk=BM.07.03");
    const seeded = bcthVstStatsHref("bm02", {
      tu_ngay: "2026-01-01",
      den_ngay: "2026-01-31",
      khoa_ids: ["k1"],
    });
    expect(seeded).toContain("/thong-ke/gsc?");
    expect(seeded).toContain("bk=BM.07.02");
    expect(seeded).toContain("khoa_ids=k1");
    expect(bcthVstStatsHref("who", { tu_ngay: "2026-01-01", den_ngay: "2026-01-31" })).not.toContain("bk=");
  });

  it("slot KPI không gộp và không lấy pool GSC", () => {
    const payload = composeBaoCaoTongHopPayload({
      filters: { tu_ngay: "2026-01-01", den_ngay: "2026-01-31", chuyen_de: "ALL", khoa_ids: ["k1"] },
      vst: {
        kpis: { tong_co_hoi: 10, da_tuan_thu: 8, ty_le_tuan_thu: 80 },
        trendline: [],
        matrix_nghe: [],
      } as never,
      gsc: {
        kpis: { tong_phien: 2, tong_quan_sat: 20, tong_dat: 10, tong_vi_pham: 10, ty_le_tuan_thu: 50 },
        trendline: [],
        checklist_overview: [
          {
            ma_bk: "BM.07.02",
            ten_bang_kiem: "KT",
            tong_phien: 1,
            tong_quan_sat: 4,
            tong_dat: 3,
            tong_vi_pham: 1,
            ty_le_tuan_thu: 75,
            worst_khoa_ten: null,
            worst_khoa_ty_le: null,
            top_violation_ten: null,
            top_violation_so: null,
          },
        ],
        gap_analysis: [],
        dynamic_checklists: [],
        top_violations: [],
        matrix_khoa: [],
        workload: {
          khoa_tu_giam_sat: 0,
          khoa_duoc_ksnk_giam_sat: 0,
          chuyen_de_duoc_ksnk_phu: 0,
          ksnk_so_phien: 0,
          co_cau_giam_sat: [],
        },
      } as never,
      nkbv: null,
      sources: { vst: "ok", gsc: "ok", nkbv: "skipped" },
      errors: {},
    });
    const slots = buildBcthVstKpiSlots(payload);
    expect(slots.map((s) => s.field)).toEqual(["ty_le_vst", "ty_le_vst_ky_thuat", "ty_le_vst_ngoai_khoa"]);
    expect(slots.map((s) => s.display)).toEqual(["80.0%", "75.0%", "—"]);
    expect(slots[0]?.href).toContain("/thong-ke/vst");
    expect(slots[0]?.href).not.toContain("bk=");
    expect(slots[1]?.href).toContain("bk=BM.07.02");
    expect(slots[2]?.href).toContain("bk=BM.07.03");
    expect(slots[1]?.note).toContain("ty_le_dung_ky_thuat");
    expect(slots.some((s) => isGscPoolField(s.field))).toBe(false);
    expect(payload.kpis.ty_le_gsc).toBe(50);
    expect(slots.every((s) => s.display !== "50.0%" || s.field !== "ty_le_vst")).toBe(true);
  });
});
