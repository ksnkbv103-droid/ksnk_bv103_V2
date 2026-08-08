/**
 * Pure rollup tiến độ: checklist/% việc → % nhiệm vụ → % kế hoạch năm.
 * Mốc (nếu có) không bắt buộc — % nhiệm vụ = TB mọi việc con active.
 */

export type QlcvRollupTask = {
  id: string;
  nhiem_vu_id?: string | null;
  moc_id?: string | null;
  trang_thai: string;
  phan_tram_hoan_thanh: number;
  is_active?: boolean;
};

export type QlcvRollupMoc = {
  id: string;
  nhiem_vu_id: string;
  is_active?: boolean;
};

export type QlcvRollupNhiemVu = {
  id: string;
  trang_thai: string;
  is_active?: boolean;
};

/** % một phiếu — HOAN_THANH=100; loại DA_HUY / inactive. */
export function pctCongViecForRollup(task: QlcvRollupTask): number | null {
  if (task.is_active === false) return null;
  if (task.trang_thai === "DA_HUY") return null;
  if (task.trang_thai === "HOAN_THANH") return 100;
  const n = Number(task.phan_tram_hoan_thanh);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function averageOrZero(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

export function pctMocFromTasks(mocId: string, tasks: QlcvRollupTask[]): {
  pct: number;
  taskCount: number;
  assigned: boolean;
} {
  const pcts: number[] = [];
  for (const t of tasks) {
    if (t.moc_id !== mocId) continue;
    const p = pctCongViecForRollup(t);
    if (p == null) continue;
    pcts.push(p);
  }
  return { pct: averageOrZero(pcts), taskCount: pcts.length, assigned: pcts.length > 0 };
}

/**
 * % nhiệm vụ = TB % mọi việc con (active, không hủy) — kể cả việc gắn mốc.
 * `mocs` giữ tham số để tương thích gọi cũ; không chặn rollup khi thiếu mốc.
 */
export function pctNhiemVuFromTree(
  nhiemVuId: string,
  mocs: QlcvRollupMoc[],
  tasks: QlcvRollupTask[],
): { pct: number; mocCount: number; taskCount: number; taskDoneCount: number } {
  const pcts: number[] = [];
  let taskDoneCount = 0;
  for (const t of tasks) {
    if (t.nhiem_vu_id !== nhiemVuId) continue;
    const p = pctCongViecForRollup(t);
    if (p == null) continue;
    pcts.push(p);
    if (p >= 100) taskDoneCount += 1;
  }
  const mocCount = mocs.filter((m) => m.nhiem_vu_id === nhiemVuId && m.is_active !== false).length;
  return {
    pct: averageOrZero(pcts),
    mocCount,
    taskCount: pcts.length,
    taskDoneCount,
  };
}

/** % kế hoạch năm = TB % nhiệm vụ active ≠ HUY. */
export function pctKeHoachFromNhiemVu(
  nhiemVuIds: string[],
  nhiemVuRows: QlcvRollupNhiemVu[],
  mocs: QlcvRollupMoc[],
  tasks: QlcvRollupTask[],
): { pct: number; nhiemVuCount: number } {
  const pcts: number[] = [];
  for (const id of nhiemVuIds) {
    const row = nhiemVuRows.find((n) => n.id === id);
    if (!row || row.is_active === false || row.trang_thai === "HUY") continue;
    const r = pctNhiemVuFromTree(id, mocs, tasks);
    pcts.push(r.pct);
  }
  return { pct: averageOrZero(pcts), nhiemVuCount: pcts.length };
}
