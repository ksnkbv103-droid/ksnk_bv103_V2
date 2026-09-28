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
});
