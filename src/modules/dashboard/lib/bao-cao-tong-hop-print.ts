import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { topBottomKhoa } from "./bao-cao-tong-hop-core";
import type { BaoCaoKhoaRankRow, BaoCaoTrendPoint, BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

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
  gscChecklistClusters: Record<string, GscStrategicPayload>;
  gscChecklistTruncated: number;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
};

type MatrixRow = {
  ten: string;
  tong: number;
  dat: number;
  ty_le: number;
};

const pickLabels = (ids: string[], options: MultiSelectOption[]) =>
  ids?.length && ids.length < options?.length
    ? options
        .filter((o) => ids.includes(o.id))
        .map((o) => o.label)
        .join(", ")
    : "Tất cả";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v}%`;
}

function fmtDelta(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "— so với tuần trước";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}% so với tuần trước`;
}

function toVstMatrixRows(
  rows: { ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[] | undefined,
): MatrixRow[] {
  return (rows ?? []).map((r) => ({
    ten: r.ten,
    tong: r.tong_co_hoi,
    dat: r.da_tuan_thu,
    ty_le: r.ty_le_tuan_thu,
  }));
}

function toGscMatrixRows(
  rows: { ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[] | undefined,
): MatrixRow[] {
  return (rows ?? []).map((r) => ({
    ten: r.ten,
    tong: r.tong_quan_sat,
    dat: r.tong_dat,
    ty_le: r.ty_le_tuan_thu,
  }));
}

function renderMatrixTable(
  title: string,
  rows: MatrixRow[],
  tongLabel: string,
  datLabel: string,
): string {
  if (rows.length === 0) {
    return `<h3>${escHtml(title)}</h3><p class="muted">Không có dữ liệu trong phạm vi lọc.</p>`;
  }
  const sorted = [...rows].sort((a, b) => a.ty_le - b.ty_le);
  return `
    <h3>${escHtml(title)}</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Nhóm</th>
          <th>${escHtml(tongLabel)}</th>
          <th>${escHtml(datLabel)}</th>
          <th>Tỷ lệ tuân thủ</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${r.tong.toLocaleString()}</td>
            <td>${r.dat.toLocaleString()}</td>
            <td class="${r.ty_le < 70 ? "text-danger" : "text-success"}"><strong>${r.ty_le}%</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderKhoaRankSection(top: BaoCaoKhoaRankRow[], bottom: BaoCaoKhoaRankRow[]): string {
  if (top.length === 0 && bottom.length === 0) {
    return `<p class="muted">Chưa có xếp hạng khoa trong phạm vi lọc.</p>`;
  }
  const rowHtml = (rows: BaoCaoKhoaRankRow[], title: string) => `
    <h3>${escHtml(title)}</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa/phòng</th>
          <th>VST %</th>
          <th>GSC %</th>
          <th>TB %</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${fmtPct(r.ty_le_vst)}</td>
            <td>${fmtPct(r.ty_le_gsc)}</td>
            <td><strong>${fmtPct(r.ty_le_avg)}</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  return rowHtml(top, "Top 5 khoa (tuân thủ cao)") + rowHtml(bottom, "Bottom 5 khoa (cần ưu tiên)");
}

function renderTrendWeekTable(points: BaoCaoTrendPoint[]): string {
  if (points.length === 0) {
    return `<p class="muted">Chưa đủ dữ liệu xu hướng tuần.</p>`;
  }
  return `
    <table>
      <thead>
        <tr>
          <th>Tuần</th>
          <th>VST %</th>
          <th>GSC %</th>
          <th>CCS %</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${points
          .map((p) => {
            const note =
              (p.vst_tong ?? 0) === 0 && (p.gsc_tong ?? 0) === 0
                ? "Không có phiên"
                : (p.vst_tong ?? 0) === 0
                  ? "Chỉ GSC"
                  : (p.gsc_tong ?? 0) === 0
                    ? "Chỉ VST"
                    : "";
            return `
          <tr>
            <td class="text-left">${escHtml(p.label)}</td>
            <td>${fmtPct(p.ty_le_vst)}</td>
            <td>${fmtPct(p.ty_le_gsc)}</td>
            <td><strong>${fmtPct(p.ty_le_ccs)}</strong></td>
            <td class="text-left" style="font-size:11px;">${escHtml(note)}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function renderGscKhoaMatrix(gsc: GscStrategicPayload | null): string {
  const rows = [...(gsc?.matrix_khoa ?? [])].sort((a, b) => a.ty_le_tuan_thu - b.ty_le_tuan_thu);
  if (rows.length === 0) return `<p class="muted">Chưa có ma trận khoa GSC.</p>`;
  const slice = rows.slice(0, 25);
  return `
    <h3>Tỷ lệ tuân thủ theo khoa (Giám sát chung — ${slice.length}/${rows.length} khoa có dữ liệu)</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa/phòng</th>
          <th>Mã</th>
          <th>Khảo sát</th>
          <th>Đạt</th>
          <th>Tỷ lệ</th>
        </tr>
      </thead>
      <tbody>
        ${slice
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${escHtml(r.ma_khoa ?? "—")}</td>
            <td>${r.tong_quan_sat.toLocaleString()}</td>
            <td>${r.tong_dat.toLocaleString()}</td>
            <td class="${r.ty_le_tuan_thu < 70 ? "text-danger" : ""}"><strong>${r.ty_le_tuan_thu}%</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderChecklistTrends(
  gsc: GscStrategicPayload | null,
  clusters: Record<string, GscStrategicPayload>,
  truncated: number,
): string {
  const list = gsc?.dynamic_checklists ?? [];
  if (list.length === 0) return `<p class="muted">Không có chuyên đề GSC trong kỳ.</p>`;

  const blocks = list.map((bk) => {
    const cluster = clusters[bk.ma_bk];
    const trend = cluster?.trendline ?? [];
    const title = bk.ten_bang_kiem;
    if (trend.length === 0) {
      return `<h4 class="bk-title">${escHtml(title)}</h4><p class="muted">Kỳ: ${bk.ty_le_tuan_thu}% (${bk.tong_phien} phiên) — chưa đủ tuần để xu hướng.</p>`;
    }
    return `
      <h4 class="bk-title">${escHtml(title)} <span style="font-weight:normal;">(kỳ: ${bk.ty_le_tuan_thu}%)</span></h4>
      <table>
        <thead>
          <tr><th>Tuần</th><th>Khảo sát</th><th>Đạt</th><th>Tỷ lệ %</th></tr>
        </thead>
        <tbody>
          ${trend
            .map(
              (t) => `
            <tr>
              <td class="text-left">${escHtml(t.label)}</td>
              <td>${t.tong_quan_sat.toLocaleString()}</td>
              <td>${t.tong_dat.toLocaleString()}</td>
              <td><strong>${t.ty_le_tuan_thu}%</strong></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`;
  });

  const truncNote =
    truncated > 0
      ? `<p class="muted">(Chỉ in xu hướng chi tiết cho tối đa 12 chuyên đề; ${truncated} chuyên đề còn lại xem trên hệ thống.)</p>`
      : "";

  return blocks.join("") + truncNote;
}

const PRINT_STYLES = `
    @page { size: A4; margin: 15mm 15mm 20mm 20mm; }
    body { font-family: "Times New Roman", Times, serif; color: #1e293b; font-size: 13px; line-height: 1.5; margin: 0; padding: 0; }
    .page-break { page-break-before: always; }
    .header { display: flex; justify-content: space-between; border-bottom: 1.5pt solid var(--primary); padding-bottom: 10px; margin-bottom: 20px; }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 45%; }
    .report-title { text-align: center; margin: 30px 0; }
    .report-title h1 { font-size: 18px; margin: 0; color: var(--primary); text-transform: uppercase; font-weight: bold; }
    .report-title p { margin: 5px 0; font-style: italic; font-size: 13px; }
    h2 { font-size: 14px; color: var(--primary); border-left: 4pt solid var(--primary); padding-left: 10px; margin: 25px 0 15px; text-transform: uppercase; font-weight: bold; }
    h3 { font-size: 13px; color: #334155; margin: 15px 0 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px; font-weight: bold; }
    h4.bk-title { font-size: 12px; color: #0f172a; margin: 12px 0 6px; font-weight: bold; }
    .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .summary-box p { margin: 5px 0; font-size: 13px; }
    .muted { font-size: 12px; color: #64748b; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 12px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; }
    th { background: #f1f5f9; font-weight: bold; color: #0f172a; }
    td.text-left { text-align: left; }
    .text-danger { color: #dc2626; font-weight: bold; }
    .text-success { color: #166534; font-weight: bold; }
    .bg-highlight { background-color: #fef2f2; }
    .section-box { border: 1pt solid #cbd5e1; padding: 15px; background: #fff; margin-top: 10px; min-height: 80px; text-align: justify; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 40%; }
    @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
`;

export function getBaoCaoTongHopPrintHtml(p: BaoCaoTongHopPrintParams): string {
  const kpi = p.payload?.kpis;
  const { top, bottom } = topBottomKhoa(p.payload?.khoa_rank ?? [], 5);
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

  const dieuHanhSection = `
    <h2>ĐIỀU HÀNH TỔNG HỢP (PROCESS)</h2>
    <p class="muted">CCS = 50% tuân thủ VST + 50% tuân thủ GSC trong phạm vi lọc. NKBV là chỉ số lâm sàng, không gộp CCS.</p>
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
          <td class="text-left"><strong>Tuân thủ tổng hợp (CCS)</strong></td>
          <td class="text-success"><strong>${fmtPct(kpi?.ty_le_ccs)}</strong></td>
          <td style="font-size:11px;">${escHtml(fmtDelta(kpi?.delta_ccs))}</td>
        </tr>
        <tr>
          <td class="text-left">Vệ sinh tay (VST)</td>
          <td>${fmtPct(kpi?.ty_le_vst)}</td>
          <td style="font-size:11px;">${escHtml(fmtDelta(kpi?.delta_vst))}</td>
        </tr>
        <tr>
          <td class="text-left">Giám sát chung (GSC)</td>
          <td>${fmtPct(kpi?.ty_le_gsc)}</td>
          <td style="font-size:11px;">${escHtml(fmtDelta(kpi?.delta_gsc))}</td>
        </tr>
        <tr>
          <td class="text-left">NKBV — tỷ lệ xác nhận/PA</td>
          <td>${fmtPct(kpi?.ti_le_xac_nhan_nkbv)} (${kpi?.tong_phieu_nkbv ?? 0} phiếu)</td>
          <td>—</td>
        </tr>
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo tuần (VST + GSC + CCS)</h3>
    ${renderTrendWeekTable(p.payload?.trend_week ?? [])}
    <h3>3. So sánh theo khoa</h3>
    ${renderKhoaRankSection(top, bottom)}
  `;

  const phanTichCheo = `
    <div class="page-break"></div>
    <h2>PHÂN TÍCH THEO KHU VỰC VÀ ĐỐI TƯỢNG</h2>
    ${renderMatrixTable("VST — Theo vùng IPAC (4 màu)", toVstMatrixRows(p.vstPayload?.matrix_khu_vuc_nhom), "Cơ hội", "Tuân thủ")}
    ${renderMatrixTable("GSC — Theo vùng IPAC (4 màu)", toGscMatrixRows(p.gscPayload?.matrix_khu_vuc_nhom), "Khảo sát", "Đạt")}
    ${renderMatrixTable("VST — Theo khu vực giám sát (chi tiết)", toVstMatrixRows(p.vstPayload?.matrix_khu_vuc), "Cơ hội", "Tuân thủ")}
    ${renderMatrixTable("GSC — Theo khu vực giám sát (chi tiết)", toGscMatrixRows(p.gscPayload?.matrix_khu_vuc), "Khảo sát", "Đạt")}
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
    <h3>3. Đối soát Tự giám sát vs KSNK (top 10 khoa)</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa</th>
          <th>TGS %</th>
          <th>KSNK %</th>
          <th>Gap</th>
        </tr>
      </thead>
      <tbody>
        ${(p.vstPayload.gap_analysis || [])
          .slice(0, 10)
          .map(
            (g, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(g.ten)}</td>
            <td>${g.ty_le_tgs != null ? `${g.ty_le_tgs}%` : "—"}</td>
            <td>${g.ty_le_ksnk != null ? `${g.ty_le_ksnk}%` : "—"}</td>
            <td>${g.do_lech != null ? `${Math.abs(g.do_lech)}%` : "—"}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
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
        </tr>
      </thead>
      <tbody>
        ${(p.gscPayload.dynamic_checklists || [])
          .map(
            (bk, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(bk.ten_bang_kiem)}</td>
            <td>${bk.tong_phien.toLocaleString()}</td>
            <td>${bk.tong_quan_sat.toLocaleString()}</td>
            <td>${bk.tong_dat.toLocaleString()}</td>
            <td><strong>${bk.ty_le_tuan_thu}%</strong></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo từng bảng kiểm</h3>
    ${renderChecklistTrends(p.gscPayload, p.gscChecklistClusters, p.gscChecklistTruncated)}
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

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Báo cáo tổng hợp KSNK - BV103</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div style="font-weight: bold; font-size: 12px;">BỘ QUỐC PHÒNG</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">BỆNH VIỆN QUÂN Y 103</div>
    </div>
    <div class="header-right">
      <div style="font-weight: bold; font-size: 12px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="margin-top: 8px; font-size: 11px;">Số: ${escHtml(p.reportNo)}</div>
    </div>
  </div>
  <div class="report-title">
    <h1>BÁO CÁO TỔNG HỢP CÔNG TÁC GIÁM SÁT KIỂM SOÁT NHIỄM KHUẨN</h1>
    <p>(Kỳ: ${fmtIsoDate(p.tuNgay)} — ${fmtIsoDate(p.denNgay)})</p>
  </div>
  <div class="summary-box">
    <p><strong>Phạm vi khoa:</strong> ${escHtml(pickLabels(p.selectedKhoaIds, p.khoaOptions))}.</p>
    <p><strong>Đối tượng:</strong> ${escHtml(pickLabels(p.selectedNgheIds, p.ngheOptions))}.</p>
    <p><strong>Khu vực lọc:</strong> ${escHtml(pickLabels(p.selectedKhuVucIds, p.khuVucOptions))}.</p>
    <p><strong>Cường độ:</strong> ${khoaTuGiamSat} khoa tự GS; KSNK phụ ${ksnkPhuKhoa} khoa; ${tongPhienKsnk.toLocaleString()} phiên KSNK.</p>
  </div>
  ${dieuHanhSection}
  ${phanTichCheo}
  ${vstSection}
  ${gscSection}
  <div class="page-break"></div>
  <h2>III. ĐÁNH GIÁ VÀ KIẾN NGHỊ CỦA KHOA KSNK</h2>
  <div style="font-weight: bold; margin-top: 15px;">1. Nhận xét, đánh giá:</div>
  <div class="section-box">${p.nhanXetDanhGia ? escHtml(p.nhanXetDanhGia).replace(/\n/g, "<br/>") : "Chưa có nội dung"}</div>
  <div style="font-weight: bold; margin-top: 15px;">2. Kiến nghị, đề xuất:</div>
  <div class="section-box">${p.kienNghiDeXuat ? escHtml(p.kienNghiDeXuat).replace(/\n/g, "<br/>") : "Chưa có nội dung"}</div>
  <div style="margin-top: 25px; font-style: italic; text-align: right;">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
  <div class="signature">
    <div class="signature-box">
      <div style="font-weight: bold; text-transform: uppercase;">Người tổng hợp</div>
      <div style="margin-top: 70px;">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="signature-box">
      <div style="font-weight: bold; text-transform: uppercase;">Chủ nhiệm khoa KSNK</div>
      <div style="margin-top: 70px;">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
  <div class="footer no-print">Hệ thống KSNK BV103 — Báo cáo tổng hợp (in nội bộ)</div>
</body>
</html>`;
}
