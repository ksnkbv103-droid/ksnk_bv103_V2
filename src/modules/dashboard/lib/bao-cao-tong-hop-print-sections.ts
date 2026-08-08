import {
  resolveChecklistOverview,
  resolveTopInterventionChecklists,
} from "@/lib/analytics/gsc-checklist-intervention";
import {
  buildGapKhoaRows,
  gapExclusionReason,
  isGapComparable,
  khoaChartLabel,
  KHOA_COMPLIANCE_WARN_PCT,
  normalizeGapKhoaRow,
  sortGapRowsByMetric,
} from "@/lib/analytics/supervision-matrix-mappers";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { formatBaoCaoIssueDateVi } from "./bao-cao-tong-hop-core";
import { escHtml, fmtIsoDate, fmtPct } from "./bao-cao-tong-hop-print-format";
import { BAO_CAO_TONG_HOP_THRESHOLDS } from "./bao-cao-tong-hop-thresholds";
import type { BaoCaoKhoaRankRow, BaoCaoTrendPoint } from "../types/bao-cao-tong-hop.types";
import type { GscChecklistDetailPayload, GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

type MatrixRow = {
  ten: string;
  tong: number;
  dat: number;
  ty_le: number;
};

function narrativeBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return `<span class="empty-placeholder">Chưa có nội dung</span>`;
  return escHtml(trimmed).replace(/\n/g, "<br/>");
}

export function renderPrintCoverMeta(args: {
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
  const printedAt = formatDateTimeVi(args.printedAt);
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

export function renderPhanIiiSection(nhanXet: string, kienNghi: string, issueDate: Date): string {
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

export function toVstMatrixRows(
  rows: { ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[] | undefined,
): MatrixRow[] {
  return (rows ?? []).map((r) => ({
    ten: r.ten,
    tong: r.tong_co_hoi,
    dat: r.da_tuan_thu,
    ty_le: r.ty_le_tuan_thu,
  }));
}

export function toGscMatrixRows(
  rows: { ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[] | undefined,
): MatrixRow[] {
  return (rows ?? []).map((r) => ({
    ten: r.ten,
    tong: r.tong_quan_sat,
    dat: r.tong_dat,
    ty_le: r.ty_le_tuan_thu,
  }));
}

export function renderMatrixTable(
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

function worstCompliance(row: BaoCaoKhoaRankRow): number | null {
  const parts = [row.ty_le_gsc, row.ty_le_vst].filter((x): x is number => x != null);
  if (parts.length === 0) return null;
  return Math.min(...parts);
}

function khoaRankPrintClass(row: BaoCaoKhoaRankRow): string {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) return "";
  const v = worstCompliance(row);
  if (v == null) return "";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN) return "text-success";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "text-warning";
  return "text-danger";
}

function khoaGroupPrintLabel(row: BaoCaoKhoaRankRow): string {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) return "Chưa GS";
  const v = worstCompliance(row);
  if (v == null) return "—";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN) return "Nhóm cao";
  if (v >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "Trung bình";
  return "Ưu tiên";
}

export function renderFullKhoaRankSection(rows: BaoCaoKhoaRankRow[]): string {
  const withData = rows.filter((r) => r.has_data !== false && r.tong_co_hoi_vst + r.tong_quan_sat_gsc > 0);
  if (withData.length === 0) {
    return `<p class="muted">Chưa có xếp hạng khoa có dữ liệu trong phạm vi lọc.</p>`;
  }
  return `
    <p class="muted">Sắp xếp GSC rồi VST thấp → cao (ẩn khoa không có dữ liệu). Ngưỡng xanh ≥${BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}%, vàng ≥${BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN}%.</p>
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa/phòng</th>
          <th>VST %</th>
          <th>GSC %</th>
          <th>Mẫu số</th>
          <th>Nhóm</th>
        </tr>
      </thead>
      <tbody>
        ${withData
          .map((r, i) => {
            const sample = [
              r.tong_co_hoi_vst > 0 ? `${r.tong_co_hoi_vst} CH` : null,
              r.tong_quan_sat_gsc > 0 ? `${r.tong_quan_sat_gsc} QS` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return `
          <tr class="${khoaRankPrintClass(r)}">
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.label)}</td>
            <td>${fmtPct(r.ty_le_vst)}</td>
            <td><strong>${fmtPct(r.ty_le_gsc)}</strong></td>
            <td style="font-size:11px;">${escHtml(sample)}</td>
            <td style="font-size:11px;">${escHtml(khoaGroupPrintLabel(r))}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    </div>`;
}

export function renderTrendWeekTable(points: BaoCaoTrendPoint[]): string {
  const withData = points.filter((p) => (p.vst_tong ?? 0) > 0 || (p.gsc_tong ?? 0) > 0);
  if (withData.length === 0) {
    return `<p class="muted">Chưa đủ dữ liệu xu hướng tuần.</p>`;
  }
  return `
    <table>
      <thead>
        <tr>
          <th>Tuần</th>
          <th>VST %</th>
          <th>GSC %</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${withData
          .map((p) => {
            const note =
              (p.vst_tong ?? 0) === 0
                ? "Chỉ GSC"
                : (p.gsc_tong ?? 0) === 0
                  ? "Chỉ VST"
                  : "";
            return `
          <tr>
            <td class="text-left">${escHtml(p.label)}</td>
            <td>${fmtPct(p.ty_le_vst)}</td>
            <td>${fmtPct(p.ty_le_gsc)}</td>
            <td class="text-left" style="font-size:11px;">${escHtml(note)}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function gapPrintCompareLabel(row: ReturnType<typeof normalizeGapKhoaRow>): string {
  if (isGapComparable(row)) {
    if (row.ty_le_ksnk != null && row.ty_le_tgs != null) {
      const delta = Math.abs(Math.round((row.ty_le_ksnk - row.ty_le_tgs) * 100) / 100);
      return `Δ ${delta}%`;
    }
    return "Đủ đối soát";
  }
  return gapExclusionReason(row) ?? "—";
}

function gapPrintPctClass(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "";
  if (pct >= KHOA_COMPLIANCE_WARN_PCT) return "text-success";
  if (pct >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "text-warning";
  return "text-danger";
}

function gapPrintPctCell(pct: number | null, dat: number, tong: number): string {
  if (pct == null || tong === 0) return "—";
  return `${pct}% (${dat.toLocaleString()}/${tong.toLocaleString()})`;
}

export function renderKhoaGapModulePrint(
  title: string,
  rows: ReturnType<typeof buildGapKhoaRows>,
  limit = 30,
): string {
  const sorted = sortGapRowsByMetric(rows, "ty_le_ksnk", "desc").slice(0, limit);
  if (sorted.length === 0) {
    return `<h4>${escHtml(title)}</h4><p class="muted">Chưa có dữ liệu khoa trong phạm vi lọc.</p>`;
  }
  return `
    <h4>${escHtml(title)}</h4>
    <p class="muted">Sắp xếp KSNK % cao → thấp · cảnh báo &lt;${KHOA_COMPLIANCE_WARN_PCT}% · đối soát gộp trạng thái loại trừ.</p>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th class="text-left">Khoa</th>
          <th>KSNK %</th>
          <th>TGS %</th>
          <th>KSNK vol</th>
          <th>TGS vol</th>
          <th class="text-left">Đối soát</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(r.label)}</td>
            <td class="${gapPrintPctClass(r.ty_le_ksnk)}"><strong>${gapPrintPctCell(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}</strong></td>
            <td class="${gapPrintPctClass(r.ty_le_tgs)}">${gapPrintPctCell(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}</td>
            <td>${r.vol_ksnk > 0 ? `${r.dat_ksnk.toLocaleString()}/${r.vol_ksnk.toLocaleString()}` : "0"}</td>
            <td>${r.vol_tgs > 0 ? `${r.dat_tgs.toLocaleString()}/${r.vol_tgs.toLocaleString()}` : "0"}</td>
            <td class="text-left" style="font-size:11px;">${escHtml(gapPrintCompareLabel(r))}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

export function renderComparableGapTable(
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
            (g, i) => {
              const label = normalizeGapKhoaRow(g).label;
              return `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${escHtml(label)}</td>
            <td>${g.ty_le_tgs != null ? `${g.ty_le_tgs}%` : "—"}</td>
            <td>${g.ty_le_ksnk != null ? `${g.ty_le_ksnk}%` : "—"}</td>
            <td>${g.do_lech != null ? `${Math.abs(g.do_lech)}%` : "—"}</td>
          </tr>`;
            },
          )
          .join("")}
      </tbody>
    </table>`;
}

export function renderGscKhoaMatrix(gsc: GscStrategicPayload | null): string {
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
            <td class="text-left">${escHtml(khoaChartLabel(r))}</td>
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

export function renderChecklistTrends(
  gsc: GscStrategicPayload | null,
  details: Record<string, GscChecklistDetailPayload>,
  truncated: number,
): string {
  const list = resolveChecklistOverview(gsc);
  if (list.length === 0) return `<p class="muted">Không có chuyên đề GSC trong kỳ.</p>`;

  const printList = resolveTopInterventionChecklists(
    gsc,
    Object.keys(details).length || list.length,
  );

  const blocks = printList.map((bk) => {
    const detail = details[bk.ma_bk];
    const trend = detail?.trendline ?? [];
    const title = `${bk.ma_bk} — ${bk.ten_bang_kiem}`;
    const violNote = bk.top_violation_ten
      ? `<p class="muted">Lỗi chính: ${escHtml(bk.top_violation_ten)}${bk.top_violation_so != null ? ` (${bk.top_violation_so}×)` : ""}</p>`
      : "";
    if (trend.length === 0) {
      return `<h4 class="bk-title">${escHtml(title)}</h4><p class="muted">Kỳ: ${bk.ty_le_tuan_thu}% · ${bk.tong_vi_pham} vi phạm — chưa đủ tuần để xu hướng.</p>${violNote}`;
    }
    return `
      <h4 class="bk-title">${escHtml(title)} <span style="font-weight:normal;">(kỳ: ${bk.ty_le_tuan_thu}% · ${bk.tong_vi_pham} VP)</span></h4>
      ${violNote}
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
      ? `<p class="muted">(In chi tiết xu hướng top ${Object.keys(details).length || printList.length} BK rủi ro; ${truncated} BK còn lại xem trên hệ thống.)</p>`
      : "";

  return blocks.join("") + truncNote;
}
