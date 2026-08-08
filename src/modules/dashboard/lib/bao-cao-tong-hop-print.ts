import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { resolveChecklistOverview } from "@/lib/analytics/gsc-checklist-intervention";
import { buildGapKhoaRows, mergeMasterGapRows } from "@/lib/analytics/supervision-matrix-mappers";
import { mergeKhoaRankWithSelected } from "./bao-cao-tong-hop-core";
import { escHtml, fmtDelta, fmtIsoDate, fmtPct, pickLabels } from "./bao-cao-tong-hop-print-format";
import {
  renderChecklistTrends,
  renderComparableGapTable,
  renderFullKhoaRankSection,
  renderGscKhoaMatrix,
  renderKhoaGapModulePrint,
  renderMatrixTable,
  renderPhanIiiSection,
  renderPrintCoverMeta,
  renderTrendWeekTable,
  toGscMatrixRows,
  toVstMatrixRows,
} from "./bao-cao-tong-hop-print-sections";
import { renderKhoaGscBarChartSvg, renderTrendLineChartSvg } from "./bao-cao-tong-hop-print-charts";
import { PRINT_STYLES } from "./bao-cao-tong-hop-print-styles";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import type { GscChecklistDetailPayload, GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { baoCaoPeriodMa, buildPrintFileTitle } from "@/lib/print/print-file-title";

export type BaoCaoTongHopPrintParams = {
  reportNo: string;
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
  selectedNgheIds: string[];
  ngheOptions: MultiSelectOption[];
  selectedKhuVucIds: string[];
  khuVucOptions: MultiSelectOption[];
  payload: BaoCaoTongHopPayload | null;
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  gscChecklistDetails: Record<string, GscChecklistDetailPayload>;
  gscChecklistTruncated: number;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
};

export function getBaoCaoTongHopPrintHtml(p: BaoCaoTongHopPrintParams): string {
  const kpi = p.payload?.kpis;
  const fullKhoaRank = mergeKhoaRankWithSelected(
    p.payload?.khoa_rank ?? [],
    p.selectedKhoaIds,
    p.khoaOptions,
    p.khoaOptions.length,
  );
  const tongPhienKsnk =
    (p.vstPayload?.workload?.ksnk_so_phien ?? 0) + (p.gscPayload?.workload?.ksnk_so_phien ?? 0);
  const khoaTuGiamSat = Math.max(
    p.vstPayload?.workload?.khoa_tu_giam_sat ?? 0,
    p.gscPayload?.workload?.khoa_tu_giam_sat ?? 0,
  );
  const ksnkPhuKhoa = Math.max(
    p.vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0,
    p.gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0,
  );

  const vstGapRows = buildGapKhoaRows(
    p.vstPayload?.gap_analysis,
    p.selectedKhoaIds,
    p.khoaOptions,
    p.khoaOptions.length,
  );
  const gscGapRows = buildGapKhoaRows(
    p.gscPayload?.gap_analysis,
    p.selectedKhoaIds,
    p.khoaOptions,
    p.khoaOptions.length,
  );
  const masterGapRows = mergeMasterGapRows(vstGapRows, gscGapRows);

  const dieuHanhSection = `
    <h2>ĐIỀU HÀNH TỔNG HỢP (PROCESS)</h2>
    <p class="muted">Theo dõi riêng tỷ lệ VST và GSC trong phạm vi lọc. NKBV là chỉ số lâm sàng, tách khỏi tuân thủ process.</p>
    <h3>1. Chỉ số cốt lõi kỳ báo cáo</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Chỉ số</th>
          <th>Giá trị</th>
          <th>So sánh tuần</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-left"><strong>Vệ sinh tay (VST)</strong></td>
          <td class="text-success"><strong>${fmtPct(kpi?.ty_le_vst)}</strong></td>
          <td style="font-size:11px;">${escHtml(fmtDelta(kpi?.delta_vst))}</td>
        </tr>
        <tr>
          <td class="text-left"><strong>Giám sát chung (GSC)</strong></td>
          <td class="text-success"><strong>${fmtPct(kpi?.ty_le_gsc)}</strong></td>
          <td style="font-size:11px;">${escHtml(fmtDelta(kpi?.delta_gsc))}</td>
        </tr>
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo tuần (VST + GSC)</h3>
    ${renderTrendLineChartSvg(p.payload?.trend_week ?? [])}
    ${renderTrendWeekTable(p.payload?.trend_week ?? [])}
    <h3>3. So sánh theo khoa (VST · GSC — thấp → cao)</h3>
    ${renderKhoaGscBarChartSvg(fullKhoaRank)}
    ${renderFullKhoaRankSection(fullKhoaRank)}
    <h3>3b. Tuân thủ & khối lượng theo khoa (gộp VST · GSC)</h3>
    ${renderKhoaGapModulePrint("Gộp VST + GSC", masterGapRows)}
    <h3>4. Kết quả NKBV (lâm sàng — tách khỏi tuân thủ process)</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Chỉ số</th>
          <th>Giá trị</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-left">Tỷ lệ xác nhận/PA</td>
          <td>${fmtPct(kpi?.ti_le_xac_nhan_nkbv)} (${kpi?.tong_phieu_nkbv ?? 0} phiếu)</td>
        </tr>
      </tbody>
    </table>
    ${
      p.payload?.cssd
        ? `
    <h3>5. Phụ lục CSSD (vận hành — tách khỏi tuân thủ process)</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Chỉ số</th>
          <th>Giá trị</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-left">Sản lượng cấp phát</td>
          <td>${p.payload.cssd.san_luong_cap_phat.toLocaleString("vi-VN")}</td>
        </tr>
        <tr>
          <td class="text-left">Tỷ lệ quy trình không sự cố</td>
          <td>${fmtPct(p.payload.cssd.ty_le_quy_trinh_khong_su_co)}</td>
        </tr>
        <tr>
          <td class="text-left">Số bộ danh mục</td>
          <td>${p.payload.cssd.so_bo_danh_muc.toLocaleString("vi-VN")}</td>
        </tr>
        <tr>
          <td class="text-left">Mẻ / QC đạt</td>
          <td>${p.payload.cssd.so_me_ky.toLocaleString("vi-VN")}${
            p.payload.cssd.ty_le_qc_dat_me != null
              ? ` · ${fmtPct(p.payload.cssd.ty_le_qc_dat_me)}`
              : ""
          }</td>
        </tr>
        <tr>
          <td class="text-left">Máy sẵn sàng / sửa·BT</td>
          <td>${p.payload.cssd.may_ready} / ${p.payload.cssd.may_repairing}</td>
        </tr>
      </tbody>
    </table>
    <table>
      <thead>
        <tr>
          <th class="text-left">Trạm</th>
          <th>Hoàn thành kỳ</th>
        </tr>
      </thead>
      <tbody>
        ${p.payload.cssd.station_volume
          .map(
            (s) =>
              `<tr><td class="text-left">${escHtml(s.label)}</td><td>${s.completed.toLocaleString("vi-VN")}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>`
        : ""
    }
  `;

  const phanTichCheo = `
    <div class="page-break"></div>
    <h2>PHÂN TÍCH THEO KHU VỰC VÀ ĐỐI TƯỢNG</h2>
    ${renderMatrixTable("VST — Theo chức năng phòng", toVstMatrixRows(p.vstPayload?.matrix_khu_vuc), "Cơ hội", "Tuân thủ")}
    ${renderMatrixTable("GSC — Theo chức năng phòng", toGscMatrixRows(p.gscPayload?.matrix_khu_vuc), "Khảo sát", "Đạt")}
    ${renderMatrixTable("VST — Theo đối tượng (nghề)", toVstMatrixRows(p.vstPayload?.matrix_nghe), "Cơ hội", "Tuân thủ")}
    ${renderMatrixTable("GSC — Theo đối tượng (nghề)", toGscMatrixRows(p.gscPayload?.matrix_nghe), "Khảo sát", "Đạt")}
    ${renderGscKhoaMatrix(p.gscPayload)}
  `;

  const vstSection = p.vstPayload
    ? `
    <div class="page-break"></div>
    <h2>I. KẾT QUẢ GIÁM SÁT TUÂN THỦ VỆ SINH TAY (WHO)</h2>
    <h3>1. Chỉ số cốt lõi</h3>
    <table>
      <thead>
        <tr>
          <th>Tổng cơ hội</th>
          <th>Đã tuân thủ</th>
          <th>Tỷ lệ tuân thủ</th>
          <th>Đúng kỹ thuật</th>
          <th>Đủ thời gian</th>
          <th>Lạm dụng găng</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${p.vstPayload.kpis.tong_co_hoi.toLocaleString()}</td>
          <td>${p.vstPayload.kpis.da_tuan_thu.toLocaleString()}</td>
          <td class="text-success">${p.vstPayload.kpis.ty_le_tuan_thu}%</td>
          <td>${p.vstPayload.kpis.ty_le_dung_ky_thuat}%</td>
          <td>${p.vstPayload.kpis.ty_le_du_thoi_gian}%</td>
          <td class="${p.vstPayload.kpis.ty_le_lam_dung_gang > 5 ? "text-danger bg-highlight" : ""}">${p.vstPayload.kpis.ty_le_lam_dung_gang}%</td>
        </tr>
      </tbody>
    </table>
    <h3>2. Phân bổ theo 5 thời điểm (Moment)</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Thời điểm</th>
          <th>Cơ hội</th>
          <th>Tuân thủ</th>
          <th>Tỷ lệ %</th>
        </tr>
      </thead>
      <tbody>
        ${(p.vstPayload.moments || [])
          .map(
            (m, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(m.ten)}</td>
            <td>${m.tong_co_hoi.toLocaleString()}</td>
            <td>${m.da_tuan_thu.toLocaleString()}</td>
            <td><strong>${m.ty_le_tuan_thu}%</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${renderComparableGapTable("3. Đối soát Tự giám sát vs KSNK (khoa đủ hai nguồn)", p.vstPayload.gap_analysis ?? [], 10)}
  `
    : "";

  const gscSection =
    p.gscPayload && p.gscPayload.kpis.tong_phien > 0
      ? `
    <div class="page-break"></div>
    <h2>II. KẾT QUẢ GIÁM SÁT CHUNG (CÁC CHUYÊN ĐỀ)</h2>
    <h3>1. Kết quả theo chuyên đề (cả kỳ)</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Chuyên đề</th>
          <th>Phiên</th>
          <th>Khảo sát</th>
          <th>Đạt</th>
          <th>Tỷ lệ %</th>
          <th>Vi phạm</th>
        </tr>
      </thead>
      <tbody>
        ${resolveChecklistOverview(p.gscPayload)
          .map(
            (bk, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(bk.ma_bk)} — ${escHtml(bk.ten_bang_kiem)}</td>
            <td>${bk.tong_phien.toLocaleString()}</td>
            <td>${bk.tong_quan_sat.toLocaleString()}</td>
            <td>${bk.tong_dat.toLocaleString()}</td>
            <td><strong>${bk.ty_le_tuan_thu}%</strong></td>
            <td>${bk.tong_vi_pham.toLocaleString()}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo từng bảng kiểm</h3>
    ${renderChecklistTrends(p.gscPayload, p.gscChecklistDetails, p.gscChecklistTruncated)}
    <h3>3. Top 10 tiêu chí vi phạm</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Tiêu chí</th>
          <th class="text-left">Chuyên đề</th>
          <th>Vi phạm</th>
          <th>Tỷ lệ %</th>
        </tr>
      </thead>
      <tbody>
        ${(p.gscPayload.top_violations || [])
          .slice(0, 10)
          .map(
            (v, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(v.ten_tieu_chi)}</td>
            <td class="text-left">${escHtml(v.ten_bang_kiem)}</td>
            <td class="text-danger">${v.so_vi_pham.toLocaleString()}</td>
            <td class="text-danger"><strong>${v.ty_le_vi_pham}%</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `
      : "";

  const issueDate = new Date();
  const coverMeta = renderPrintCoverMeta({
    reportNo: p.reportNo,
    tuNgay: p.tuNgay,
    denNgay: p.denNgay,
    khoaLabel: pickLabels(p.selectedKhoaIds, p.khoaOptions),
    ngheLabel: pickLabels(p.selectedNgheIds, p.ngheOptions),
    khuLabel: pickLabels(p.selectedKhuVucIds, p.khuVucOptions),
    printedAt: issueDate,
    khoaTuGiamSat,
    ksnkPhuKhoa,
    tongPhienKsnk,
  });
  const phanIii = renderPhanIiiSection(p.nhanXetDanhGia, p.kienNghiDeXuat, issueDate);
  const fileTitle = buildPrintFileTitle({
    loai: "BAOCAO",
    ma: baoCaoPeriodMa(p.reportNo),
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escHtml(fileTitle)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="print-page-footer">
    <span>BỆNH VIỆN QUÂN Y 103 · KHOA KIỂM SOÁT NHIỄM KHUẨN · ${escHtml(p.reportNo)}</span>
    <span>In từ hệ thống KSNK BV103</span>
  </div>
  <div class="header">
    <div class="header-left">
      <div style="font-weight: bold; font-size: 12px;">BỆNH VIỆN QUÂN Y 103</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">KHOA KIỂM SOÁT NHIỄM KHUẨN</div>
    </div>
    <div class="header-right">
      <div style="font-weight: bold; font-size: 12px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="margin-top: 8px; font-size: 11px;">Số: ${escHtml(p.reportNo)}</div>
    </div>
  </div>
  <div class="report-title">
    <h1>BÁO CÁO TỔNG HỢP CÔNG TÁC GIÁM SÁT KIỂM SOÁT NHIỄM KHUẨN</h1>
    <p>(Kỳ báo cáo: ${fmtIsoDate(p.tuNgay)} — ${fmtIsoDate(p.denNgay)})</p>
  </div>
  ${coverMeta}
  ${dieuHanhSection}
  ${phanTichCheo}
  ${vstSection}
  ${gscSection}
  ${phanIii}
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}
