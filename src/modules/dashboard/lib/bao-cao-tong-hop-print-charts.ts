/** SVG tĩnh nhúng bản in — không phụ thuộc canvas/Recharts. */

import { escHtml, fmtPct } from "./bao-cao-tong-hop-print-format";
import type { BaoCaoKhoaRankRow, BaoCaoTrendPoint } from "../types/bao-cao-tong-hop.types";

const COLORS = {
  vst: "#10b981",
  gsc: "#38bdf8",
  bar: "#0ea5e9",
  warn: "#f59e0b",
  danger: "#ef4444",
  grid: "#e2e8f0",
};

function barColor(pct: number | null): string {
  if (pct == null) return COLORS.grid;
  if (pct < 70) return COLORS.danger;
  if (pct < 80) return COLORS.warn;
  return COLORS.bar;
}

/** Biểu đồ cột GSC % theo khoa (đã sắp thấp→cao, tối đa 12). */
export function renderKhoaGscBarChartSvg(rows: BaoCaoKhoaRankRow[]): string {
  const data = rows
    .filter((r) => r.has_data !== false && (r.tong_quan_sat_gsc > 0 || r.tong_co_hoi_vst > 0))
    .slice(0, 12);
  if (data.length === 0) return "";

  const W = 640;
  const H = 220;
  const padL = 36;
  const padB = 48;
  const padT = 16;
  const padR = 12;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = chartW / data.length;

  const bars = data
    .map((r, i) => {
      const pct = r.ty_le_gsc ?? r.ty_le_vst;
      if (pct == null) return "";
      const h = (pct / 100) * chartH;
      const x = padL + i * barW + barW * 0.15;
      const y = padT + chartH - h;
      const w = barW * 0.7;
      const label = escHtml((r.label || r.ten).slice(0, 8));
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${barColor(pct)}" rx="2"/>
        <text x="${(x + w / 2).toFixed(1)}" y="${(padT + chartH + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#475569">${label}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#0f172a">${fmtPct(pct)}</text>`;
    })
    .join("");

  return `
    <div class="chart-block">
      <p class="muted">Biểu đồ tuân thủ theo khoa (ưu tiên GSC % · thấp → cao · tối đa 12 khoa có dữ liệu)</p>
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto;" xmlns="http://www.w3.org/2000/svg">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="${COLORS.grid}"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="${COLORS.grid}"/>
        ${bars}
      </svg>
    </div>`;
}

/** Biểu đồ đường VST/GSC theo tuần (SVG polyline). */
export function renderTrendLineChartSvg(points: BaoCaoTrendPoint[]): string {
  const data = points.filter((p) => (p.vst_tong ?? 0) > 0 || (p.gsc_tong ?? 0) > 0).slice(-16);
  if (data.length < 2) return "";

  const W = 640;
  const H = 200;
  const padL = 36;
  const padB = 36;
  const padT = 16;
  const padR = 12;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xAt = (i: number) => padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const yAt = (pct: number) => padT + chartH - (pct / 100) * chartH;

  const poly = (key: "ty_le_vst" | "ty_le_gsc", color: string) => {
    const pts = data
      .map((p, i) => {
        const v = p[key];
        if (v == null) return null;
        return `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`;
      })
      .filter(Boolean);
    if (pts.length < 2) return "";
    return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.join(" ")}"/>`;
  };

  const labels = data
    .map((p, i) => {
      if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return "";
      return `<text x="${xAt(i).toFixed(1)}" y="${(H - 8).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b">${escHtml(p.label.slice(0, 8))}</text>`;
    })
    .join("");

  return `
    <div class="chart-block">
      <p class="muted">Xu hướng tuần — <span style="color:${COLORS.vst}">VST</span> · <span style="color:${COLORS.gsc}">GSC</span></p>
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto;" xmlns="http://www.w3.org/2000/svg">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="${COLORS.grid}"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="${COLORS.grid}"/>
        ${poly("ty_le_vst", COLORS.vst)}
        ${poly("ty_le_gsc", COLORS.gsc)}
        ${labels}
      </svg>
    </div>`;
}
