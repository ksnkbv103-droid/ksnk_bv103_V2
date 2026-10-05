/**
 * Stats MVP 19b §2.4 — Số việc (mở) · % hoàn thành · % quá hạn trong tập mở.
 * Mẫu 0 → null (UI «—»). TU_CHOI tính là mở (N-QLCV-1).
 */
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isBoardLaneQuaHan } from "./qlcv-board-lanes";

export type QlcvMvpStatsInput = {
  trang_thai?: string | null;
  is_active?: boolean | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

export type QlcvMvpStats = {
  /** Số việc mở (active, chưa HOAN_THANH/DA_HUY). */
  tong: number;
  mo: number;
  hoanThanh: number;
  quaHan: number;
  /** null khi mẫu 0 → UI «—». */
  pctHoanThanh: number | null;
  pctQuaHan: number | null;
};

function pctOrNull(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

/** Mẫu số mở / % theo 19b; dùng chung Điều hành + tab Báo cáo. */
export function computeQlcvMvpStats(rows: QlcvMvpStatsInput[]): QlcvMvpStats {
  const active = rows.filter((r) => r.is_active !== false);
  let mo = 0;
  let hoanThanh = 0;
  let daHuy = 0;
  let quaHan = 0;

  for (const r of active) {
    const st = normalizeQlcvTrangThaiToCanonical(r.trang_thai);
    if (st === "HOAN_THANH") {
      hoanThanh += 1;
      continue;
    }
    if (st === "DA_HUY") {
      daHuy += 1;
      continue;
    }
    mo += 1;
    if (isBoardLaneQuaHan(r as never)) quaHan += 1;
  }

  // N-QLCV-7: mẫu % HT = active trừ DA_HUY (TU_CHOI tính); board không lọc kỳ.
  const mauHt = active.length - daHuy;

  return {
    tong: mo,
    mo,
    hoanThanh,
    quaHan,
    pctHoanThanh: pctOrNull(hoanThanh, mauHt),
    pctQuaHan: pctOrNull(quaHan, mo),
  };
}
