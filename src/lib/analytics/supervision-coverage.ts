import type { GapKhoaRow } from "./supervision-matrix-mappers";

export type SupervisionCoverageSummary = {
  total: number;
  /** Khoa có ít nhất một lượt giám sát (TGS hoặc KSNK) trong kỳ. */
  covered: number;
  tgsCovered: number;
  ksnkCovered: number;
  /** Tên khoa chưa có lượt nào, xếp theo nhãn. */
  uncovered: string[];
  /** Phần trăm làm tròn; null khi chưa có khoa nào trong phạm vi. */
  pct: number | null;
};

/** Độ phủ giám sát: đếm khoa có dữ liệu trong kỳ, từ gap_analysis sẵn có (không bảng mới). */
export function buildCoverageSummary(rows: GapKhoaRow[]): SupervisionCoverageSummary {
  const total = rows.length;
  const tgsCovered = rows.filter((r) => r.vol_tgs > 0).length;
  const ksnkCovered = rows.filter((r) => r.vol_ksnk > 0).length;
  const coveredRows = rows.filter((r) => r.vol_tgs > 0 || r.vol_ksnk > 0);
  const uncovered = rows
    .filter((r) => r.vol_tgs <= 0 && r.vol_ksnk <= 0)
    .map((r) => r.label || r.ten)
    .sort((a, b) => a.localeCompare(b, "vi"));
  return {
    total,
    covered: coveredRows.length,
    tgsCovered,
    ksnkCovered,
    uncovered,
    pct: total > 0 ? Math.round((coveredRows.length / total) * 100) : null,
  };
}
