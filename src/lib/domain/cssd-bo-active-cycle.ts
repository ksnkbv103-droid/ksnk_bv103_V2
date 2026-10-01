/** Chu kỳ còn lưu hành — khớp q_active trên v_cssd_bo_dung_cu_summary. */
export type ActiveCirculationCycle = {
  is_active: boolean | null;
  tinh_trang: string | null;
};

/** PostgREST tương đương tinh_trang IS DISTINCT FROM 'MAT' (NULL vẫn chặn). */
export const CSSD_ACTIVE_CIRCULATION_TINH_TRANG_OR = "tinh_trang.is.null,tinh_trang.neq.MAT";

export function isActiveCirculationCycle(row: ActiveCirculationCycle): boolean {
  return row.is_active === true && row.tinh_trang !== "MAT";
}

export function countActiveCirculationCycles(rows: readonly ActiveCirculationCycle[]): number {
  let n = 0;
  for (const row of rows) {
    if (isActiveCirculationCycle(row)) n += 1;
  }
  return n;
}

/** null = được tắt/xóa. Có ≥1 chu kỳ thì từ chối cả thao tác. */
export function blockDeactivateForActiveCycles(cycleCount: number): string | null {
  if (cycleCount < 1) return null;
  return `Không tắt hoặc xóa bộ: còn ${cycleCount} chu kỳ đang lưu hành (hiệu lực, chưa mất). Không ghi thay đổi.`;
}
