import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { resolveChecklistOverview } from "@/lib/analytics/gsc-checklist-intervention";
import { buildGapKhoaRows } from "@/lib/analytics/supervision-matrix-mappers";
import { isVstHubBangKiemExcludedFromGscGeneric } from "@/lib/domain/gsc-lop-giam-sat-filter";
import { buildVeSinhTayKpiCards } from "@/lib/domain/ve-sinh-tay-kpi";
import { mergeKhoaRankWithSelected } from "./bao-cao-tong-hop-core";
import { escHtml, fmtDelta, fmtIsoDate, fmtKyTruocDelta, fmtPct, pickLabels } from "./bao-cao-tong-hop-print-format";
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
import { formatNkbvXacNhanVolume } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";
import { bcthModuleComplianceTone } from "./bao-cao-tong-hop-thresholds";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";

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
  vstLensLabel?: string;
  gscLensLabel?: string;
  bangKiemLabel?: string;
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
  const vstKhoaTuGs = p.vstPayload?.workload?.khoa_tu_giam_sat ?? 0;
  const gscKhoaTuGs = p.gscPayload?.workload?.khoa_tu_giam_sat ?? 0;
  const vstKsnkPhu = p.vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0;
  const gscKsnkPhu = p.gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0;

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
  const ky = p.payload?.ky_truoc;
  const weekAndPrior = (
    week: number | null | undefined,
    prior: number | null | undefined,
    digits: 1 | 2,
  ) => {
    const priorLine =
      ky && prior != null
        ? `<div>${escHtml(fmtKyTruocDelta(prior, ky.tu_ngay, ky.den_ngay, digits))}</div>`
        : "";
    return `${escHtml(fmtDelta(week, digits))}${priorLine}`;
  };

  const vstKpiToneClass = (pct: number | null | undefined) => {
    const tone = bcthModuleComplianceTone("vst", pct ?? null);
    if (tone === "green") return "text-success";
    if (tone === "yellow") return "text-warning";
    if (tone === "red") return "text-danger";
    return "";
  };
  const gscKpiToneClass = (pct: number | null | undefined) => {
    const tone = bcthModuleComplianceTone("gsc", pct ?? null);
    if (tone === "green") return "text-success";
    if (tone === "yellow") return "text-warning";
    if (tone === "red") return "text-danger";
    return "";
  };

  const cssdAnalyticsHref = cssdReportAnalyticsHref({
    tab: "volume",
    from: p.tuNgay,
    to: p.denNgay,
  });

  const dieuHanhSection = `
    <h2>ĐIỀU HÀNH TỔNG HỢP — Tuân thủ quy trình</h2>
    <p class="muted">Theo dõi riêng tỷ lệ VST và GSC trong phạm vi lọc. NKBV là chỉ số lâm sàng, tách khỏi tuân thủ quy trình.</p>
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
          <td class="${vstKpiToneClass(kpi?.ty_le_vst ?? null)}"><strong>${fmtPct(kpi?.ty_le_vst)}</strong></td>
          <td style="font-size:11px;">${weekAndPrior(kpi?.delta_vst, ky?.delta_vst, 1)}</td>
        </tr>
        <tr>
          <td class="text-left"><strong>Giám sát chung (GSC)</strong></td>
          <td class="${gscKpiToneClass(kpi?.ty_le_gsc ?? null)}"><strong>${fmtPct(kpi?.ty_le_gsc)}</strong></td>
          <td style="font-size:11px;">${weekAndPrior(kpi?.delta_gsc, ky?.delta_gsc, 2)}</td>
        </tr>
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo tuần (VST + GSC)</h3>
    ${renderTrendLineChartSvg(p.payload?.trend_week ?? [])}
    ${renderTrendWeekTable(p.payload?.trend_week ?? [])}
    <h3>3. So sánh theo khoa (VST và GSC riêng — thấp → cao)</h3>
    ${renderKhoaGscBarChartSvg(fullKhoaRank)}
    ${renderFullKhoaRankSection(fullKhoaRank)}
    <h3>3b. Tuân thủ và khối lượng theo khoa — từng nguồn</h3>
    ${renderKhoaGapModulePrint("VST", vstGapRows, "vst", 30, 1)}
    ${renderKhoaGapModulePrint("GSC", gscGapRows, "gsc", 30, 2)}
    <h3>4. Kết quả NKBV (lâm sàng — tách khỏi tuân thủ quy trình)</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Chỉ số</th>
          <th>Giá trị</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-left">Tỷ lệ xác nhận (mẫu đã kết luận)</td>
          <td>${fmtPct(kpi?.ti_le_xac_nhan_nkbv)}${
            p.payload?.nkbv?.kpis
              ? ` (${formatNkbvXacNhanVolume(p.payload.nkbv.kpis)}; ${p.payload.nkbv.kpis.tong_phieu} phiếu trong kỳ)`
              : kpi?.tong_phieu_nkbv != null
                ? ` (${kpi.tong_phieu_nkbv} phiếu)`
                : ""
          }</td>
        </tr>
      </tbody>
    </table>
    ${
      p.payload?.cssd
        ? `
    <h3>5. Phụ lục CSSD — số liệu toàn viện (vận hành)</h3>
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
    </table>
    <p class="muted">Chi tiết đầy đủ: mở «Báo cáo CSSD» trên hệ thống (cùng kỳ lọc).</p>`
        : ""
    }
  `;

  const phanTichCheo = `
    <div class="page-break"></div>
    <h2>PHÂN TÍCH THEO KHU VỰC VÀ ĐỐI TƯỢNG</h2>
    ${renderMatrixTable("VST — Theo chức năng phòng", toVstMatrixRows(p.vstPayload?.matrix_khu_vuc), "Cơ hội", "Tuân thủ", "vst")}
    ${renderMatrixTable("GSC — Theo chức năng phòng", toGscMatrixRows(p.gscPayload?.matrix_khu_vuc), "Tiêu chí quan sát", "Đạt", "gsc")}
    ${renderMatrixTable("VST — Theo đối tượng (nghề)", toVstMatrixRows(p.vstPayload?.matrix_nghe), "Cơ hội", "Tuân thủ", "vst")}
    ${renderMatrixTable("GSC — Theo đối tượng (nghề)", toGscMatrixRows(p.gscPayload?.matrix_nghe), "Tiêu chí quan sát", "Đạt", "gsc")}
    ${renderGscKhoaMatrix(p.gscPayload)}
  `;

  const veSinhTayCards = buildVeSinhTayKpiCards({
    vst: p.vstPayload,
    gsc: p.payload?.gsc_ve_sinh_tay ?? null,
  });
  const veSinhTayTriptychTable = `
    <h3>1. Bộ ba KPI Vệ sinh tay</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Mẫu</th>
          <th>Tỷ lệ</th>
          <th class="text-left">Khối lượng</th>
        </tr>
      </thead>
      <tbody>
        ${veSinhTayCards
          .map(
            (c) => `
          <tr>
            <td class="text-left">${escHtml(c.label)}${
              c.catalogMaBk ? ` (${escHtml(c.catalogMaBk)})` : ""
            }</td>
            <td><strong>${c.tyLe == null ? "—" : `${c.tyLe}%`}</strong></td>
            <td class="text-left">${escHtml(c.volumeNote ?? "—")}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <p class="muted" style="font-size:11px">Ba tỷ lệ riêng — không gộp thành một %. BM.02/BM.03 không thuộc tổng Giám sát chung.</p>`;

  const vstKpis = p.vstPayload?.kpis;
  const vstNoSample = (vstKpis?.tong_co_hoi ?? 0) <= 0;
  const vstPctCell = (v: number | null | undefined) =>
    vstNoSample || v == null ? "—" : `${v}%`;
  const vstSection = p.vstPayload
    ? `
    <div class="page-break"></div>
    <h2>I. KẾT QUẢ GIÁM SÁT TUÂN THỦ VỆ SINH TAY</h2>
    ${veSinhTayTriptychTable}
    <h3>2. Chi tiết WHO 5 thời điểm</h3>
    <table>
      <thead>
        <tr>
          <th>Tổng cơ hội</th>
          <th>Đã tuân thủ</th>
          <th>Tỷ lệ tuân thủ</th>
          <th>Kỹ thuật (phiếu WHO)</th>
          <th>Đủ thời gian (phiếu WHO)</th>
          <th>Bỏ sót khi đang mang găng</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${vstNoSample ? "—" : vstKpis!.tong_co_hoi.toLocaleString()}</td>
          <td>${vstNoSample ? "—" : vstKpis!.da_tuan_thu.toLocaleString()}</td>
          <td>${vstPctCell(vstKpis?.ty_le_tuan_thu ?? null)}</td>
          <td>${vstPctCell(vstKpis?.ty_le_dung_ky_thuat ?? null)}</td>
          <td>${vstPctCell(vstKpis?.ty_le_du_thoi_gian ?? null)}</td>
          <td>${vstPctCell(vstKpis?.ty_le_lam_dung_gang ?? null)}</td>
        </tr>
      </tbody>
    </table>
    <p class="text-muted" style="font-size:11px">Chi tiết phiếu WHO — không phải chỉ số BM.02 kỹ thuật thường quy.</p>
    <h3>3. Phân bổ theo 5 thời điểm (Moment)</h3>
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
    ${renderComparableGapTable("4. Đối soát tự giám sát vs chuyên trách (khoa đủ hai nguồn)", p.vstPayload.gap_analysis ?? [], 10)}
  `
    : p.payload?.gsc_ve_sinh_tay
      ? `
    <div class="page-break"></div>
    <h2>I. KẾT QUẢ GIÁM SÁT TUÂN THỦ VỆ SINH TAY</h2>
    ${veSinhTayTriptychTable}
  `
      : "";

  const gscTopViolations = (p.gscPayload?.top_violations || []).filter(
    (v) => !isVstHubBangKiemExcludedFromGscGeneric(v.ma_bk),
  );
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
          <th>Tiêu chí quan sát</th>
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
            <td><strong>${bk.ty_le_tuan_thu == null ? "—" : `${bk.ty_le_tuan_thu}%`}</strong></td>
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
        ${gscTopViolations
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
    vstKhoaTuGs,
    gscKhoaTuGs,
    vstKsnkPhu,
    gscKsnkPhu,
    tongPhienKsnk,
    vstLensLabel: p.vstLensLabel,
    gscLensLabel: p.gscLensLabel,
    bangKiemLabel: p.bangKiemLabel,
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
