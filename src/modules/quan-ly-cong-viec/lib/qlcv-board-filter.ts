import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "./qlcv-workflow-display";
import { isBoardLaneDangLam, isBoardLaneQuaHan, type KanbanColumnId } from "./qlcv-board-lanes";

export type QlcvBoardFilter = "TOTAL" | "MY_TASKS" | "IN_PROGRESS" | "OVERDUE" | "GATE_CHO_TOI";

export type QlcvBoardFilterContext = {
  actorStaffId?: string | null;
};

export { type KanbanColumnId } from "./qlcv-board-lanes";

export function getKanbanFocusColumnForFilter(
  filter: QlcvBoardFilter | null,
  showProposalColumn: boolean,
): KanbanColumnId | null {
  if (filter == null || filter === "TOTAL" || filter === "MY_TASKS") return null;
  if (filter === "GATE_CHO_TOI") return showProposalColumn ? "DE_XUAT" : "CHO_DUYET";
  if (filter === "IN_PROGRESS" || filter === "OVERDUE") return "DANG_LAM";
  return null;
}

function isQlcvClosed(t: Record<string, unknown>): boolean {
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai as string | null);
  return st === "HOAN_THANH" || st === "DA_HUY";
}

/** Việc giao cho tôi hoặc đề xuất do tôi gửi — chỉ việc còn mở. */
export function isMyQlcvTask(
  t: Record<string, unknown>,
  actorStaffId: string | null | undefined,
): boolean {
  if (!actorStaffId) return false;
  if (isQlcvClosed(t)) return false;
  const assignee = String(t.nguoi_phu_trach_id ?? "");
  if (assignee && assignee === actorStaffId) return true;
  if (isDeXuatChoDuyet(t) && String(t.nguoi_tao_id ?? "") === actorStaffId) return true;
  return false;
}

export function isQlcvChoToiDuyet(t: Record<string, unknown>): boolean {
  return isDeXuatChoDuyet(t) || isChoNghiemThuHoanThanh(t);
}

export function formatBoardFilterHint(f: QlcvBoardFilter): string {
  switch (f) {
    case "TOTAL":
      return "Tất cả";
    case "MY_TASKS":
      return "Của tôi";
    case "IN_PROGRESS":
      return "Cần làm";
    case "OVERDUE":
      return "Quá hạn";
    case "GATE_CHO_TOI":
      return "Chờ tôi";
    default:
      return f;
  }
}

/** Lọc danh sách theo thẻ thống kê đã chọn. */
export function matchesQlcvBoardFilter(
  t: Record<string, unknown>,
  filter: QlcvBoardFilter | null,
  ctx?: QlcvBoardFilterContext,
): boolean {
  if (!filter || filter === "TOTAL") return true;
  if (filter === "MY_TASKS") return isMyQlcvTask(t, ctx?.actorStaffId);
  if (filter === "GATE_CHO_TOI") return isQlcvChoToiDuyet(t);
  if (filter === "OVERDUE") return isBoardLaneQuaHan(t);
  if (filter === "IN_PROGRESS") return isBoardLaneDangLam(t);
  return true;
}
