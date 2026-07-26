import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "./qlcv-workflow-display";
import { isBoardLaneDangLam, isBoardLaneQuaHan, type KanbanColumnId } from "./qlcv-board-lanes";

export type QlcvBoardFilter =
  | "TOTAL"
  | "MY_TASKS"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "GATE_DEXUAT"
  | "GATE_NGHIEMTHU"
  | "NEAR_DEADLINE";

export type QlcvBoardFilterContext = {
  actorStaffId?: string | null;
};

export { type KanbanColumnId } from "./qlcv-board-lanes";

export function getKanbanFocusColumnForFilter(
  filter: QlcvBoardFilter | null,
  showProposalColumn: boolean,
): KanbanColumnId | null {
  if (filter == null || filter === "TOTAL" || filter === "MY_TASKS") return null;
  if (filter === "GATE_DEXUAT") return showProposalColumn ? "DE_XUAT" : "DANG_LAM";
  if (filter === "GATE_NGHIEMTHU") return "CHO_DUYET";
  if (filter === "IN_PROGRESS") return "DANG_LAM";
  if (filter === "OVERDUE") return "QUA_HAN";
  if (filter === "COMPLETED") return "HOAN_THANH";
  if (filter === "NEAR_DEADLINE") return "DANG_LAM";
  return null;
}

function isNearDeadlineTask(t: { han_hoan_thanh?: string | null; trang_thai?: string | null }): boolean {
  if (!t.han_hoan_thanh) return false;
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  if (st === "HOAN_THANH" || st === "DA_HUY") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(t.han_hoan_thanh);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 2;
}

/** Việc giao cho tôi hoặc đề xuất do tôi gửi (chờ duyệt). */
export function isMyQlcvTask(
  t: Record<string, unknown>,
  actorStaffId: string | null | undefined,
): boolean {
  if (!actorStaffId) return false;
  const assignee = String(t.nguoi_phu_trach_id ?? "");
  if (assignee && assignee === actorStaffId) return true;
  if (isDeXuatChoDuyet(t) && String(t.nguoi_tao_id ?? "") === actorStaffId) return true;
  return false;
}

export function formatBoardFilterHint(f: QlcvBoardFilter): string {
  switch (f) {
    case "TOTAL":
      return "Tất cả";
    case "MY_TASKS":
      return "Việc của tôi";
    case "IN_PROGRESS":
      return "Đang làm";
    case "COMPLETED":
      return "Đã hoàn thành";
    case "OVERDUE":
      return "Cần xử lý gấp (quá hạn)";
    case "GATE_DEXUAT":
      return "Chờ phê đề xuất";
    case "GATE_NGHIEMTHU":
      return "Chờ nghiệm thu";
    case "NEAR_DEADLINE":
      return "Sắp đến hạn (≤2 ngày)";
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
  if (filter === "GATE_DEXUAT") return isDeXuatChoDuyet(t);
  if (filter === "GATE_NGHIEMTHU") return isChoNghiemThuHoanThanh(t);
  if (filter === "COMPLETED") return normalizeQlcvTrangThaiToCanonical(t.trang_thai as string | null) === "HOAN_THANH";
  if (filter === "OVERDUE") return isBoardLaneQuaHan(t);
  if (filter === "NEAR_DEADLINE") return isNearDeadlineTask(t);
  if (filter === "IN_PROGRESS") return isBoardLaneDangLam(t);
  return true;
}
