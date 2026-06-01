/**
 * Map phiếu → lane Kanban (một hàm, thứ tự ưu tiên).
 */

import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

export type QlcvBoardLaneId =
  | "lane_da_huy"
  | "lane_hoan_thanh"
  | "lane_qua_han"
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
  | "QUA_HAN"
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

export function getBoardLaneId(t: CongViecBoardInput): QlcvBoardLaneId {
  const st = String(t.trang_thai || "");
  if (st === "DA_HUY") return "lane_da_huy";
  if (st === "HOAN_THANH") return "lane_hoan_thanh";

  const quaHan = st === "QUA_HAN" || t.is_qua_han === true || isDeadlinePastOpen(t);
  if (quaHan) return "lane_qua_han";

  if (isChoNghiemThuHoanThanh(t)) return "lane_cho_duyet";
  if (isDeXuatChoDuyet(t)) return "lane_de_xuat";

  return "lane_dang_lam";
}

export function boardLaneToKanbanColumn(lane: QlcvBoardLaneId, showProposalColumn: boolean): KanbanColumnId {
  if (lane === "lane_de_xuat") return showProposalColumn ? "DE_XUAT" : "DANG_LAM";
  switch (lane) {
    case "lane_dang_lam":
      return "DANG_LAM";
    case "lane_qua_han":
      return "QUA_HAN";
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
  return getBoardLaneId(t) === "lane_qua_han";
}

export function isBoardLaneDangLam(t: CongViecBoardInput): boolean {
  return getBoardLaneId(t) === "lane_dang_lam";
}
