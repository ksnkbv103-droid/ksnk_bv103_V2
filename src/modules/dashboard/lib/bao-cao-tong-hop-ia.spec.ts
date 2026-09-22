import { describe, expect, it } from "vitest";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { composeBaoCaoTongHopPayload } from "./bao-cao-tong-hop-core";
import {
  BCTH_GSC_POOL_SURFACE,
  BCTH_MORE_SECTIONS,
  BCTH_PRIMARY_SECTIONS,
  BCTH_VST_KPI_FIELDS,
  BCTH_SURFACES,
  BCTH_VST_KPI_SURFACE,
  bcthFrontProcessFields,
  bcthVstStatsHref,
  bkSurfFlags,
  buildBcthVstKpiSlots,
  gscSurfFlags,
  isGscPoolField,
  whoSurfFlags,
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
    expect(slots.map((s) => s.surf)).toEqual(["SURF_WHO", "SURF_BM02", "SURF_BM03"]);
    expect(slots.map((s) => s.field)).toEqual(["ty_le_vst", "ty_le_vst_ky_thuat", "ty_le_vst_ngoai_khoa"]);
    expect(BCTH_SURFACES.find((s) => s.id === "SURF_GSC")?.section).toBe("bc-gsc");
    expect(BCTH_SURFACES.filter((s) => s.section === "bc-vst")).toHaveLength(3);
    expect(slots.map((s) => s.display)).toEqual(["80.0%", "75.0%", "—"]);
    expect(slots[0]?.href).toContain("/thong-ke/vst");
    expect(slots[0]?.href).not.toContain("bk=");
    expect(slots[1]?.href).toContain("bk=BM.07.02");
    expect(slots[2]?.href).toContain("bk=BM.07.03");
    expect(slots[1]?.note).toContain("ty_le_dung_ky_thuat");
    expect(slots.some((s) => isGscPoolField(s.field))).toBe(false);
    expect(whoSurfFlags(payload).doiTuong).toBe(false);
    expect(whoSurfFlags(payload).khuVuc).toBe(false);
    const withCuts = {
      ...payload,
      vst: {
        ...payload.vst!,
        matrix_nghe: [{ id: "n", ten: "ĐD", tong_co_hoi: 4, da_tuan_thu: 3, ty_le_tuan_thu: 75 }],
        matrix_khu_vuc: [{ ten: "Buồng", tong_co_hoi: 4, da_tuan_thu: 2, ty_le_tuan_thu: 50 }],
        matrix_hinh_thuc: [{ ten: "Tự giám sát", tong_co_hoi: 4, da_tuan_thu: 3, ty_le_tuan_thu: 75 }],
        gap_analysis: [{ id: "k1", ten: "A", tgs_co_hoi: 1, tgs_dat: 1, ty_le_tgs: 100, ksnk_co_hoi: 0, ksnk_dat: 0, ty_le_ksnk: null, do_lech: null }],
      },
      gsc: {
        ...payload.gsc!,
        matrix_nghe: [{ ten: "HS", tong_quan_sat: 9, tong_dat: 8, ty_le_tuan_thu: 88 }],
        matrix_khu_vuc: [{ ten: "Hành lang", tong_quan_sat: 9, tong_dat: 1, ty_le_tuan_thu: 11 }],
        matrix_hinh_thuc: [{ ten: "Chuyên trách", tong_quan_sat: 9, tong_dat: 8, ty_le_tuan_thu: 88 }],
        gap_analysis: [{ id: "k9", ten: "Z", tgs_quan_sat: 2, tgs_dat: 1, ty_le_tgs: 50, ksnk_quan_sat: 2, ksnk_dat: 2, ty_le_ksnk: 100, do_lech: -50 }],
      },
    };
    expect(whoSurfFlags(withCuts)).toEqual({ khoa: true, doiTuong: true, khuVuc: true, lensHt: true });
    expect(gscSurfFlags(payload).doiTuong).toBe(false);
    expect(gscSurfFlags(withCuts).doiTuong).toBe(true);
    expect(gscSurfFlags(withCuts).khuVuc).toBe(true);
    expect(whoSurfFlags({ ...withCuts, vst: { ...withCuts.vst, matrix_nghe: [] } }).doiTuong).toBe(false);
    expect(
      bkSurfFlags({
        ma_bk: "BM.07.02",
        ten_bang_kiem: "KT",
        kpis: { tong_phien: 1, tong_quan_sat: 2, tong_dat: 1, tong_vi_pham: 1, ty_le_tuan_thu: 50 },
        trendline: [],
        matrix_khoa: [],
        matrix_criterion: [],
        criterion_khoa: [],
        gap_analysis: [{ id: "k", ten: "A", tgs_quan_sat: 1, tgs_dat: 1, ty_le_tgs: 100, ksnk_quan_sat: 0, ksnk_dat: 0, ty_le_ksnk: null, do_lech: null }],
        matrix_nghe: [{ ten: "ĐD", tong_quan_sat: 2, tong_dat: 1, ty_le_tuan_thu: 50 }],
        matrix_khu_vuc: [],
        matrix_hinh_thuc: [{ ten: "Tự giám sát", tong_quan_sat: 2, tong_dat: 1, ty_le_tuan_thu: 50 }],
      }),
    ).toEqual({ khoa: true, doiTuong: true, khuVuc: false, lensHt: true });
    expect(payload.kpis.ty_le_gsc).toBe(50);
    expect(slots.every((s) => s.display !== "50.0%" || s.field !== "ty_le_vst")).toBe(true);
  });
});
