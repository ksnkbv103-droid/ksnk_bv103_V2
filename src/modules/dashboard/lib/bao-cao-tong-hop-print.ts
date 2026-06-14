import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import {
  buildCoverageMatrix,
  buildGapKhoaRows,
  COVERAGE_STATUS_LABELS,
  coverageCellStatus,
  findGapRowByKhoaId,
  gapExclusionReason,
  isGapComparable,
  normalizeGapKhoaRow,
  type CoverageTopicInput,
} from "@/lib/analytics/supervision-matrix-mappers";
import { mergeKhoaRankWithSelected, formatBaoCaoIsoDateVi, formatBaoCaoIssueDateVi } from "./bao-cao-tong-hop-core";
import { BAO_CAO_TONG_HOP_THRESHOLDS } from "./bao-cao-tong-hop-thresholds";
import type { BaoCaoKhoaRankRow, BaoCaoTrendPoint, BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import type { TgsCoverageKhoaRow } from "@/lib/analytics/tgs-coverage-mappers";
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
  tgsCoverageRanking?: TgsCoverageKhoaRow[];
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
  return formatBaoCaoIsoDateVi(iso);
}

function narrativeBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return `<span class="empty-placeholder">Chưa có nội dung</span>`;
  return escHtml(trimmed).replace(/\n/g, "<br/>");
}

function renderPrintCoverMeta(args: {
  reportNo: string;
  tuNgay: string;
  denNgay: string;
  khoaLabel: string;
  ngheLabel: string;
  khuLabel: string;
  printedAt: Date;
  khoaTuGiamSat: number;
  ksnkPhuKhoa: number;
  tongPhienKsnk: number;
}): string {
  const printedAt = `${String(args.printedAt.getHours()).padStart(2, "0")}:${String(args.printedAt.getMinutes()).padStart(2, "0")} — ${fmtIsoDate(args.printedAt.toISOString().slice(0, 10))}`;
  return `
    <dl class="cover-meta">
      <div class="cover-meta-row">
        <dt>Kỳ báo cáo</dt>
        <dd>Từ ${fmtIsoDate(args.tuNgay)} đến ${fmtIsoDate(args.denNgay)}</dd>
      </div>
      <div class="cover-meta-row">
        <dt>Mã báo cáo</dt>
        <dd>${escHtml(args.reportNo)}</dd>
      </div>
      <div class="cover-meta-row">
        <dt>Phạm vi khoa</dt>
        <dd>${escHtml(args.khoaLabel)}</dd>
      </div>
      <div class="cover-meta-row">
        <dt>Đối tượng</dt>
        <dd>${escHtml(args.ngheLabel)}</dd>
      </div>
      <div class="cover-meta-row">
        <dt>Khu vực lọc</dt>
        <dd>${escHtml(args.khuLabel)}</dd>
      </div>
      <div class="cover-meta-row">
        <dt>Ngày in</dt>
        <dd>${escHtml(printedAt)}</dd>
      </div>
      <div class="cover-meta-row cover-meta-wide">
        <dt>Cường độ giám sát</dt>
        <dd>${args.khoaTuGiamSat} khoa tự GS; KSNK phụ ${args.ksnkPhuKhoa} khoa; ${args.tongPhienKsnk.toLocaleString()} phiên KSNK trong kỳ.</dd>
      </div>
    </dl>`;
}

function renderPhanIiiSection(nhanXet: string, kienNghi: string, issueDate: Date): string {
  return `
    <section class="section-iii page-break">
      <h2>III. ĐÁNH GIÁ VÀ KIẾN NGHỊ CỦA KHOA KSNK</h2>
      <p class="muted section-iii-lead">Phần này do Khoa KSNK nhập trước khi in — dùng để trình Ban Giám đốc / Hội đồng KSNK.</p>
      <div class="narrative-block">
        <div class="narrative-label">1. Nhận xét, đánh giá</div>
        <div class="section-box${nhanXet.trim() ? "" : " empty"}">${narrativeBody(nhanXet)}</div>
      </div>
      <div class="narrative-block">
        <div class="narrative-label">2. Kiến nghị, đề xuất</div>
        <div class="section-box${kienNghi.trim() ? "" : " empty"}">${narrativeBody(kienNghi)}</div>
      </div>
      <div class="signature-block">
        <div class="issue-date">${formatBaoCaoIssueDateVi(issueDate)}</div>
        <div class="signature">
          <div class="signature-box">
            <div class="signature-role">Người tổng hợp</div>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-box">
            <div class="signature-role">Chủ nhiệm khoa KSNK</div>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    </section>`;
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

function khoaRankPrintClass(row: BaoCaoKhoaRankRow): string {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) return "";
  const v = row.ty_le_ccs;
  if (v == null) return "";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN) return "text-success";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "text-warning";
  return "text-danger";
}

function khoaGroupPrintLabel(row: BaoCaoKhoaRankRow): string {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) return "Chưa GS";
  const v = row.ty_le_ccs;
  if (v == null) return "—";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN) return "Nhóm cao";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "Trung bình";
  return "Ưu tiên";
}

function renderFullKhoaRankSection(rows: BaoCaoKhoaRankRow[]): string {
  if (rows.length === 0) {
    return `<p class="muted">Chưa có xếp hạng khoa trong phạm vi lọc.</p>`;
  }
  return `
    <p class="muted">Xếp hạng theo CCS (50% VST + 50% GSC). Ngưỡng xanh ≥${BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}%, vàng ≥${BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN}%.</p>
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa/phòng</th>
          <th>VST %</th>
          <th>GSC %</th>
          <th>CCS %</th>
          <th>Mẫu số</th>
          <th>Nhóm</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((r, i) => {
            const sample =
              r.tong_co_hoi_vst > 0 || r.tong_quan_sat_gsc > 0
                ? [
                    r.tong_co_hoi_vst > 0 ? `${r.tong_co_hoi_vst} CH` : null,
                    r.tong_quan_sat_gsc > 0 ? `${r.tong_quan_sat_gsc} QS` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "—";
            const ccsCell =
              r.has_data === false ? "Chưa GS" : `<strong>${fmtPct(r.ty_le_ccs)}</strong>`;
            return `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${fmtPct(r.ty_le_vst)}</td>
            <td>${fmtPct(r.ty_le_gsc)}</td>
            <td class="${khoaRankPrintClass(r)}">${ccsCell}</td>
            <td style="font-size:11px;">${escHtml(sample)}</td>
            <td style="font-size:11px;">${escHtml(khoaGroupPrintLabel(r))}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    </div>`;
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

function renderGapExclusionTable(
  title: string,
  rows: ReturnType<typeof buildGapKhoaRows>,
): string {
  const excluded = rows.filter((r) => gapExclusionReason(r) != null);
  if (excluded.length === 0) {
    return `<h4>${escHtml(title)}</h4><p class="muted">Tất cả khoa trong phạm vi đều đủ điều kiện đối soát hoặc chưa có dữ liệu.</p>`;
  }
  return `
    <h4>${escHtml(title)}</h4>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa</th>
          <th>TGS</th>
          <th>KSNK</th>
          <th class="text-left">Lý do</th>
        </tr>
      </thead>
      <tbody>
        ${excluded
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${r.vol_tgs.toLocaleString()}</td>
            <td>${r.vol_ksnk.toLocaleString()}</td>
            <td class="text-left">${escHtml(gapExclusionReason(r) ?? "—")}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderComparableGapTable(
  title: string,
  gapRows: { ten: string; ty_le_tgs: number | null; ty_le_ksnk: number | null; do_lech?: number | null }[],
  limit = 10,
): string {
  const comparable = gapRows
    .map((r) => ({ raw: r, norm: normalizeGapKhoaRow(r) }))
    .filter(({ norm }) => isGapComparable(norm))
    .map(({ raw }) => raw)
    .sort((a, b) => Math.abs(b.do_lech ?? 0) - Math.abs(a.do_lech ?? 0))
    .slice(0, limit);

  if (comparable.length === 0) {
    return `<h3>${escHtml(title)}</h3><p class="muted">Không có khoa đủ hai nguồn TGS và KSNK trong kỳ.</p>`;
  }

  return `
    <h3>${escHtml(title)}</h3>
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
        ${comparable
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
    </table>`;
}

function buildPrintCoverageTopics(
  p: BaoCaoTongHopPrintParams,
  vstGapRows: ReturnType<typeof buildGapKhoaRows>,
  gscGapRows: ReturnType<typeof buildGapKhoaRows>,
): CoverageTopicInput[] {
  const topics: CoverageTopicInput[] = [{ id: "vst", label: "VST", rows: vstGapRows }];
  const bks = [...(p.gscPayload?.dynamic_checklists ?? [])].sort(
    (a, b) => b.tong_phien - a.tong_phien,
  );
  const topBk = bks.slice(0, 8);
  if (topBk.length >= 2) {
    for (const bk of topBk) {
      const cluster = p.gscChecklistClusters[bk.ma_bk];
      topics.push({
        id: bk.ma_bk,
        label: bk.ten_bang_kiem,
        rows: buildGapKhoaRows(
          cluster?.gap_analysis ?? p.gscPayload?.gap_analysis,
          p.selectedKhoaIds,
          p.khoaOptions,
          p.khoaOptions.length,
        ),
      });
    }
  } else if (gscGapRows.length > 0) {
    topics.push({ id: "gsc-all", label: "GSC", rows: gscGapRows });
  }
  return topics;
}

function renderTgsCoverageRankingPrint(rows: TgsCoverageKhoaRow[], maxRows = 10): string {
  const slice = rows.slice(0, maxRows);
  if (slice.length === 0) {
    return `<p class="muted">Chưa có xếp hạng bao phủ TGS theo nghĩa vụ BK.</p>`;
  }
  return `
    <h3>3c. Triển khai TGS theo nghĩa vụ bảng kiểm (rút gọn)</h3>
    <table>
      <thead>
        <tr>
          <th class="text-left">Khoa</th>
          <th>Bao phủ %</th>
          <th>Thiếu BK</th>
          <th class="text-left">Mã BK thiếu</th>
        </tr>
      </thead>
      <tbody>
        ${slice
          .map(
            (r) => `
          <tr>
            <td class="text-left">${escHtml(r.ten)}</td>
            <td>${r.ty_le_bao_phu_tgs}% (${r.so_bk_da_tgs}/${r.so_bk_bat_buoc})</td>
            <td>${r.so_bk_thieu}</td>
            <td class="text-left" style="font-size:11px;">${escHtml(r.bk_thieu_labels.slice(0, 5).join(", "))}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderCoverageMatrixPrint(topics: CoverageTopicInput[], maxColumns = 8): string {
  const limited = topics.slice(0, maxColumns + 1);
  const { khoaRows, topicLabels } = buildCoverageMatrix(limited);
  if (khoaRows.length === 0 || topicLabels.length === 0) {
    return `<p class="muted">Chưa có ma trận bao phủ trong phạm vi lọc.</p>`;
  }
  return `
    <h3>4. Ma trận bao phủ TGS / KSNK (rút gọn in — tối đa ${maxColumns} BK GSC)</h3>
    <div class="table-wrap">
    <table class="wide-table">
      <thead>
        <tr>
          <th class="text-left">Khoa</th>
          ${topicLabels.map((t) => `<th>${escHtml(t.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${khoaRows
          .map(
            (khoa) => `
          <tr>
            <td class="text-left">${escHtml(khoa.label)}</td>
            ${limited
              .map((topic) => {
                const cell = coverageCellStatus(findGapRowByKhoaId(topic.rows, khoa.id));
                return `<td class="matrix-cell">${escHtml(COVERAGE_STATUS_LABELS[cell])}</td>`;
              })
              .join("")}
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    </div>`;
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
    :root { --primary: #065f46; --primary-light: #ecfdf5; }
    @page { size: A4 portrait; margin: 18mm 15mm 22mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      padding: 0 0 14mm;
    }
    .page-break { page-break-before: always; break-before: page; }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5pt solid var(--primary);
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 45%; }
    .report-title { text-align: center; margin: 24px 0 18px; }
    .report-title h1 {
      font-size: 18px;
      margin: 0;
      color: var(--primary);
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 0.02em;
    }
    .report-title p { margin: 6px 0 0; font-style: italic; font-size: 13px; }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      border: 1pt solid #cbd5e1;
      background: var(--primary-light);
      padding: 14px 16px;
      margin-bottom: 22px;
      font-size: 12px;
    }
    .cover-meta-row { display: contents; }
    .cover-meta-wide { grid-column: 1 / -1; }
    .cover-meta dt { font-weight: bold; color: #0f172a; margin: 0; }
    .cover-meta dd { margin: 0; text-align: justify; }
    h2 {
      font-size: 14px;
      color: var(--primary);
      border-left: 4pt solid var(--primary);
      padding-left: 10px;
      margin: 22px 0 12px;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    h3 {
      font-size: 13px;
      color: #334155;
      margin: 14px 0 8px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    h4.bk-title { font-size: 12px; color: #0f172a; margin: 12px 0 6px; font-weight: bold; }
    .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .summary-box p { margin: 5px 0; font-size: 13px; }
    .muted { font-size: 12px; color: #64748b; font-style: italic; }
    .table-wrap { overflow: visible; width: 100%; margin: 8px 0 16px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 11px;
      table-layout: fixed;
    }
    table.wide-table { table-layout: auto; font-size: 11px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th, td {
      border: 1px solid #94a3b8;
      padding: 5px 7px;
      text-align: center;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-weight: bold; color: #0f172a; font-size: 11px; }
    td.text-left, th.text-left { text-align: left; }
    td.matrix-cell { font-size: 11px; line-height: 1.35; }
    .text-danger { color: #dc2626; font-weight: bold; }
    .text-warning { color: #ca8a04; font-weight: bold; }
    .text-success { color: #166534; font-weight: bold; }
    .bg-highlight { background-color: #fef2f2; }
    .section-iii { margin-top: 8px; }
    .section-iii-lead { margin-bottom: 14px; }
    .narrative-block { margin-top: 12px; page-break-inside: avoid; break-inside: avoid; }
    .narrative-label { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #0f172a; }
    .section-box {
      border: 1pt solid #94a3b8;
      padding: 14px 16px;
      background: #fff;
      min-height: 110px;
      text-align: justify;
      line-height: 1.65;
      font-size: 13px;
    }
    .section-box.empty { color: #94a3b8; }
    .empty-placeholder { color: #94a3b8; font-style: italic; }
    .issue-date { margin-top: 28px; font-style: italic; text-align: right; font-size: 13px; }
    .signature-block { page-break-inside: avoid; break-inside: avoid; margin-top: 8px; }
    .signature { margin-top: 18px; display: flex; justify-content: space-between; gap: 24px; }
    .signature-box { text-align: center; width: 42%; }
    .signature-role { font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .signature-line { margin-top: 72px; font-size: 12px; }
    .print-page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 18mm 4px;
      font-size: 10px;
      color: #64748b;
      border-top: 0.5pt solid #cbd5e1;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-page-footer { position: fixed; }
    }
`;

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
  const coverageTopics = buildPrintCoverageTopics(p, vstGapRows, gscGapRows);

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
      </tbody>
    </table>
    <h3>2. Xu hướng tuân thủ theo tuần (VST + GSC + CCS)</h3>
    ${renderTrendWeekTable(p.payload?.trend_week ?? [])}
    <h3>3. So sánh theo khoa (CCS)</h3>
    ${renderFullKhoaRankSection(fullKhoaRank)}
    <h3>3b. Chưa đủ điều kiện đối soát TGS vs KSNK</h3>
    ${renderGapExclusionTable("VST", vstGapRows)}
    ${renderGapExclusionTable("GSC", gscGapRows)}
    ${renderTgsCoverageRankingPrint(p.tgsCoverageRanking ?? [])}
    ${renderCoverageMatrixPrint(coverageTopics, 8)}
    <h3>4. Kết quả NKBV (lâm sàng — tách khỏi CCS)</h3>
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

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Báo cáo tổng hợp KSNK - BV103</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="print-page-footer">
    <span>Bệnh viện Quân y 103 · Khoa KSNK · ${escHtml(p.reportNo)}</span>
    <span>In từ hệ thống KSNK BV103</span>
  </div>
  <div class="header">
    <div class="header-left">
      <div style="font-weight: bold; font-size: 12px;">BỘ QUỐC PHÒNG</div>
      <div style="font-weight: bold; font-size: 13px; text-decoration: underline;">BỆNH VIỆN QUÂN Y 103</div>
      <div style="margin-top: 6px; font-size: 11px; font-style: italic;">Khoa Kiểm soát nhiễm khuẩn</div>
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
