import { describe, expect, it } from "vitest";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";
import { getBaoCaoTongHopPrintHtml } from "./bao-cao-tong-hop-print";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

describe("bản ký phụ lục CSSD", () => {
  it("trỏ cùng href Báo cáo CSSD, không mở route báo cáo khác", () => {
    const href = cssdReportAnalyticsHref({
      tab: "volume",
      from: "2026-09-01",
      to: "2026-09-28",
    });
    const html = getBaoCaoTongHopPrintHtml({
      reportNo: "BC-TEST",
      tuNgay: "2026-09-01",
      denNgay: "2026-09-28",
      selectedKhoaIds: [],
      khoaOptions: [],
      selectedNgheIds: [],
      ngheOptions: [],
      selectedKhuVucIds: [],
      khuVucOptions: [],
      payload: {
        cssd: {
          san_luong_cap_phat: 3,
          tong_hoan_thanh_tram: 4,
          ty_le_quy_trinh_khong_su_co: 90,
          so_bo_danh_muc: 2,
          so_me_ky: 1,
          ty_le_qc_dat_me: 100,
          may_ready: 1,
          may_repairing: 0,
          station_volume: [{ station: "CAP_PHAT", label: "Cấp phát", completed: 3 }],
        },
      } as BaoCaoTongHopPayload,
      vstPayload: null,
      gscPayload: null,
      gscChecklistDetails: {},
      gscChecklistTruncated: 0,
      nhanXetDanhGia: "",
      kienNghiDeXuat: "",
    });

    expect(href).toBe("/cssd-erp/report?tab=volume&from=2026-09-01&to=2026-09-28");
    expect(html).toContain(href.replaceAll("&", "&amp;"));
    expect(html).toContain("Báo cáo CSSD");
    expect(html).not.toContain("/thong-ke/cssd");
  });

  it("bản ký tách Δ 2 tuần và vs kỳ trước, GSC giữ 2 chữ số", () => {
    const html = getBaoCaoTongHopPrintHtml({
      reportNo: "BC-TEST",
      tuNgay: "2026-06-08",
      denNgay: "2026-06-14",
      selectedKhoaIds: [],
      khoaOptions: [],
      selectedNgheIds: [],
      ngheOptions: [],
      selectedKhuVucIds: [],
      khuVucOptions: [],
      payload: {
        kpis: {
          ty_le_vst: 66.7,
          ty_le_gsc: 66.67,
          ti_le_xac_nhan_nkbv: null,
          tong_phieu_nkbv: null,
          delta_vst: 33.4,
          delta_gsc: 33.34,
        },
        ky_truoc: {
          tu_ngay: "2026-06-01",
          den_ngay: "2026-06-07",
          ty_le_vst: 33.3,
          ty_le_gsc: 33.33,
          delta_vst: 33.4,
          delta_gsc: 33.34,
        },
      } as BaoCaoTongHopPayload,
      vstPayload: null,
      gscPayload: null,
      gscChecklistDetails: {},
      gscChecklistTruncated: 0,
      nhanXetDanhGia: "",
      kienNghiDeXuat: "",
    });

    expect(html).toContain("+33.34% so với tuần trước");
    expect(html).toContain("+33.4% so với tuần trước");
    expect(html).toContain("vs kỳ trước (01-06→07-06): +33.34%");
    expect(html).toContain("vs kỳ trước (01-06→07-06): +33.4%");
  });
});
