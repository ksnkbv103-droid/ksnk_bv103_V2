/**
 * Stats MVP Domain A — tổng việc · % hoàn thành · % quá hạn.
 *
 * Nguồn: **client aggregate từ rows đã tải** (board scope / báo cáo kỳ).
 * `rpc_qlcv_board_counts` chỉ có myTasks/inProgress/overdue/choToi — **không đủ** 3 số MVP,
 * nên không dùng RPC cho strip này (tránh migrate/RPC mới).
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
  tong: number;
  hoanThanh: number;
  quaHan: number;
  pctHoanThanh: number;
  pctQuaHan: number;
};

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10; // 1 decimal
}

/** Mẫu số = rows truyền vào (board đã lọc / kỳ báo cáo). Đề xuất (is_active=false) loại khỏi mẫu số. */
export function computeQlcvMvpStats(rows: QlcvMvpStatsInput[]): QlcvMvpStats {
  const active = rows.filter((r) => r.is_active !== false);
  const tong = active.length;
  let hoanThanh = 0;
  let quaHan = 0;
  for (const r of active) {
    const st = normalizeQlcvTrangThaiToCanonical(r.trang_thai);
    if (st === "HOAN_THANH") hoanThanh += 1;
    if (isBoardLaneQuaHan(r as never)) quaHan += 1;
  }
  return {
    tong,
    hoanThanh,
    quaHan,
    pctHoanThanh: pct(hoanThanh, tong),
    pctQuaHan: pct(quaHan, tong),
  };
}
