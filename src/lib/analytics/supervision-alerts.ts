/** Cảnh báo giám sát VST/GSC theo khoa trong kỳ — khóa PO 2026-11-01: dưới 85% · chưa đủ mẫu · chưa có phiên. */

import {
  DEFAULT_KHOA_CHART_THRESHOLDS,
  DOI_SOAT_MIN_SAMPLE,
} from "@/lib/analytics/supervision-thresholds";
import type { ActionBoardSource, MatrixKhoaLike } from "@/lib/analytics/supervision-action-board";

export type SupervisionAlertKind = "duoi_85" | "chua_du_mau" | "chua_co_phien";

export type SupervisionAlert = {
  kind: SupervisionAlertKind;
  khoaId: string;
  ten: string;
  /** Null khi chưa có phiên. */
  tyLe: number | null;
  n: number;
};

export type SupervisionAlertSummary = {
  minSample: number;
  duoi85: SupervisionAlert[];
  chuaDuMau: SupervisionAlert[];
  chuaCoPhien: SupervisionAlert[];
};

type MatrixKhoaWithId = MatrixKhoaLike & { id?: string | null };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `khoaScope` = các khoa đang xét (bộ lọc); khoa có trong scope mà không có dòng ma trận → «chưa có phiên».
 * Khoa chưa đủ mẫu không bao giờ vào nhóm «dưới 85%» (không tô, không xếp hạng).
 */
export function buildSupervisionAlerts(input: {
  source: ActionBoardSource;
  matrixKhoa?: MatrixKhoaWithId[] | null;
  khoaScope?: { id: string; label: string }[];
}): SupervisionAlertSummary {
  const minSample = DOI_SOAT_MIN_SAMPLE[input.source];
  // Mốc đỏ = cùng mã `giam_sat.vang_min_pct` với màu biểu đồ (không lệch khi ADMIN đổi tham số).
  const redBelow = DEFAULT_KHOA_CHART_THRESHOLDS.redPct;
  const seen = new Set<string>();
  const duoi85: SupervisionAlert[] = [];
  const chuaDuMau: SupervisionAlert[] = [];

  for (const r of input.matrixKhoa ?? []) {
    const isGsc = input.source === "gsc" || r.tong_quan_sat != null;
    const n = num(isGsc ? r.tong_quan_sat : r.tong_co_hoi);
    const id = String(r.id ?? "");
    if (id) seen.add(id);
    if (n <= 0) continue;
    const dat = num(isGsc ? r.tong_dat : r.da_tuan_thu);
    const tyLe = r.ty_le_tuan_thu != null && Number.isFinite(Number(r.ty_le_tuan_thu))
      ? Number(r.ty_le_tuan_thu)
      : (dat / n) * 100;
    const ten = String(r.ten ?? "").trim() || String(r.ma_khoa ?? "").trim() || "—";
    if (n < minSample) chuaDuMau.push({ kind: "chua_du_mau", khoaId: id, ten, tyLe, n });
    else if (tyLe < redBelow) duoi85.push({ kind: "duoi_85", khoaId: id, ten, tyLe, n });
  }

  const chuaCoPhien: SupervisionAlert[] = (input.khoaScope ?? [])
    .filter((k) => !seen.has(k.id) || !(input.matrixKhoa ?? []).some((r) => r.id === k.id && num(r.tong_co_hoi ?? r.tong_quan_sat) > 0))
    .map((k) => ({ kind: "chua_co_phien" as const, khoaId: k.id, ten: k.label, tyLe: null, n: 0 }));

  const byTen = (a: SupervisionAlert, b: SupervisionAlert) => a.ten.localeCompare(b.ten, "vi");
  return {
    minSample,
    duoi85: duoi85.sort((a, b) => (a.tyLe ?? 0) - (b.tyLe ?? 0) || byTen(a, b)),
    chuaDuMau: chuaDuMau.sort((a, b) => a.n - b.n || byTen(a, b)),
    chuaCoPhien: chuaCoPhien.sort(byTen),
  };
}
