import { describe, expect, it } from "vitest";
import { buildPhanIiiDraft } from "./bao-cao-tong-hop-narrative-draft";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

function minimalPayload(over: Partial<BaoCaoTongHopPayload> = {}): BaoCaoTongHopPayload {
  return {
    filters: { tu_ngay: "2026-07-01", den_ngay: "2026-07-28" },
    sources: { vst: "ok", gsc: "ok", nkbv: "skipped", cssd: "skipped" },
    errors: {},
    vst: null,
    gsc: null,
    nkbv: null,
    cssd: null,
    kpis: {
      ty_le_vst: 90,
      ty_le_gsc: 80,
      ty_le_ccs: 85,
      ccs_formula_note: null,
      ti_le_xac_nhan_nkbv: null,
      tong_phieu_nkbv: null,
      delta_vst: 1,
      delta_gsc: -2,
      delta_ccs: 0,
    },
    ky_truoc: null,
    trend_week: [],
    trend_month: [],
    khoa_rank: [
      {
        id: "k1",
        ten: "Khoa A",
        label: "KA",
        ty_le_vst: 70,
        ty_le_gsc: 60,
        ty_le_avg: 65,
        ty_le_ccs: 65,
        tong_co_hoi_vst: 10,
        tong_quan_sat_gsc: 10,
        has_data: true,
      },
    ],
    capabilities: {
      topic_vst: true,
      topic_gsc: true,
      topic_nkbv: false,
      topic_cssd: false,
      compare_khoa: true,
      compare_khoi: false,
      compare_khu_vuc: false,
      compare_doi_tuong: false,
    },
    ...over,
  };
}

describe("buildPhanIiiDraft", () => {
  it("null payload → draft trung tính", () => {
    const d = buildPhanIiiDraft(null);
    expect(d.nhanXet).toMatch(/Chưa tải đủ/);
    expect(d.kienNghi.length).toBeGreaterThan(10);
  });

  it("có khoa tuân thủ thấp → nêu tên trong nhận xét", () => {
    const d = buildPhanIiiDraft(minimalPayload());
    expect(d.nhanXet).toMatch(/KA/);
    expect(d.nhanXet).toMatch(/GSC 60%/);
    expect(d.nhanXet).not.toMatch(/CCS/);
    expect(d.kienNghi).toMatch(/gợi ý/);
  });

  it("không bịa gap khi không có gap_analysis", () => {
    const d = buildPhanIiiDraft(minimalPayload());
    expect(d.nhanXet).not.toMatch(/Gap TGS/);
  });
});
