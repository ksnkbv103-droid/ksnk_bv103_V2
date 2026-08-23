/**
 * Map phiếu → lane Kanban (đời sống việc — không dùng quá hạn làm cột riêng).
 * Quá hạn là nhãn (`isQlcvBoardOverdue`): mã DB / cờ view / hạn đã qua.
 */

import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

export type QlcvBoardLaneId =
  | "lane_da_huy"
  | "lane_hoan_thanh"
  | "lane_cho_duyet"
  | "lane_dang_lam"
  | "lane_de_xuat";

export type CongViecBoardInput = CongViecLike & {
  trang_thai?: string | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

export type KanbanColumnId =
  | "DE_XUAT"
  | "DANG_LAM"
  | "CHO_DUYET"
  | "HOAN_THANH"
  | "DA_HUY";

function isDeadlinePastOpen(t: CongViecBoardInput): boolean {
  if (!t.han_hoan_thanh) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(String(t.han_hoan_thanh));
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Phiếu mở + quá hạn (mã / cờ view / hạn) — cùng ý với view + cron. */
export function isQlcvBoardOverdue(t: CongViecBoardInput): boolean {
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  if (st === "HOAN_THANH" || st === "DA_HUY") return false;
  return st === "QUA_HAN" || t.is_qua_han === true || isDeadlinePastOpen(t);
}

export function getBoardLaneId(t: CongViecBoardInput): QlcvBoardLaneId {
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  if (st === "DA_HUY") return "lane_da_huy";
  if (st === "HOAN_THANH") return "lane_hoan_thanh";
  if (isDeXuatChoDuyet(t)) return "lane_de_xuat";
  if (isChoNghiemThuHoanThanh(t)) return "lane_cho_duyet";
  return "lane_dang_lam";
}

export function boardLaneToKanbanColumn(lane: QlcvBoardLaneId, showProposalColumn: boolean): KanbanColumnId {
  if (lane === "lane_de_xuat") return showProposalColumn ? "DE_XUAT" : "DANG_LAM";
  switch (lane) {
    case "lane_dang_lam":
      return "DANG_LAM";
    case "lane_cho_duyet":
      return "CHO_DUYET";
    case "lane_hoan_thanh":
      return "HOAN_THANH";
    case "lane_da_huy":
      return "DA_HUY";
  }
}

export function getKanbanColumnIdForTask(t: CongViecBoardInput, showProposalColumn: boolean): KanbanColumnId {
  return boardLaneToKanbanColumn(getBoardLaneId(t), showProposalColumn);
}

export function isBoardLaneQuaHan(t: CongViecBoardInput): boolean {
  return isQlcvBoardOverdue(t);
}

export function isBoardLaneDangLam(t: CongViecBoardInput): boolean {
  return getBoardLaneId(t) === "lane_dang_lam";
}
