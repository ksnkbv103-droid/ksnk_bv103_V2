import {
  isMyQlcvTask,
  isQlcvHomNayCuaToi,
  type QlcvBoardFilter,
} from "./qlcv-board-filter";
import { isBoardLaneQuaHan } from "./qlcv-board-lanes";

export type QlcvNhacHanCounts = { quaHan: number; homNay: number };

/**
 * Lens mà danh sách board đã tải (lọc SQL ở getCongViecListForBoard) còn đủ việc của tôi
 * để đếm đúng. IN_PROGRESS / OVERDUE cắt bớt dữ liệu → không đếm.
 */
export function isNhacHanCountReliable(filter: QlcvBoardFilter | null): boolean {
  return filter !== "IN_PROGRESS" && filter !== "OVERDUE";
}

/** Đếm việc còn mở của tôi: quá hạn (cùng định nghĩa lens OVERDUE) và đến hạn hôm nay (giờ VN). */
export function countQlcvNhacHan(
  tasks: ReadonlyArray<Record<string, unknown>>,
  actorStaffId: string | null | undefined,
  now: Date = new Date(),
): QlcvNhacHanCounts {
  if (!actorStaffId) return { quaHan: 0, homNay: 0 };
  let quaHan = 0;
  let homNay = 0;
  for (const t of tasks) {
    if (isMyQlcvTask(t, actorStaffId) && isBoardLaneQuaHan(t, now)) quaHan++;
    if (isQlcvHomNayCuaToi(t, actorStaffId, now)) homNay++;
  }
  return { quaHan, homNay };
}
