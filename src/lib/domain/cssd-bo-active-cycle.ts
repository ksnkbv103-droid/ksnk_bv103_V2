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

/** Id bộ đã có mà import sẽ ghi `is_active=false` (ô Excel hoặc đồng bộ đầy đủ). Bộ mới không có id thì không tắt danh mục cũ. */
export function cssdBoImportDeactivateIds(input: {
  existingCodeToId: ReadonlyMap<string, string>;
  rows: readonly { code: string; isActive: boolean }[];
  softDeleteMissing: boolean;
}): string[] {
  const ids = new Set<string>();
  const planned = new Set<string>();
  for (const row of input.rows) {
    planned.add(row.code);
    if (row.isActive) continue;
    const id = input.existingCodeToId.get(row.code);
    if (id) ids.add(id);
  }
  if (input.softDeleteMissing) {
    for (const [code, id] of input.existingCodeToId) {
      if (!planned.has(code)) ids.add(id);
    }
  }
  return [...ids];
}
