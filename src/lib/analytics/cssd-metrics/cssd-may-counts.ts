/** Từ điển `may_ready` / `may_repairing`: hai đếm, không phải tỷ lệ sẵn/tổng. */
export const CSSD_MAY_COUNTS_LABEL = "Máy sẵn sàng / sửa·BT";

export function formatCssdMayReadyRepairing(ready: number, repairing: number): string {
  return `${ready} / ${repairing}`;
}
