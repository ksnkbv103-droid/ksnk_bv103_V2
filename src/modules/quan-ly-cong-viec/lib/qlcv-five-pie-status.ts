import { getBoardLaneId, type QlcvBoardLaneId } from "./qlcv-board-lanes";

/** Khóa nhóm pie — `dang_lam` khớp lane `lane_dang_lam` / mã DB `DANG_LAM` (+ `TU_CHOI`). */
export type QlcvFivePieKey = "hoan_thanh" | "huy" | "qua_han" | "dang_lam" | "cho_xu_ly";

/** 5 nhóm hiển thị trên biểu đồ — cùng nguồn lane với Kanban (`getBoardLaneId`). */
export function countCongViecFivePieSlices(tasks: unknown[]): Record<QlcvFivePieKey, number> {
  const counts: Record<QlcvFivePieKey, number> = {
    hoan_thanh: 0,
    huy: 0,
    qua_han: 0,
    dang_lam: 0,
    cho_xu_ly: 0,
  };
  for (const raw of tasks || []) {
    const t = raw as Record<string, unknown>;
    const lane = getBoardLaneId(t);
    const pie = laneToPieKey(lane);
    counts[pie] += 1;
  }
  return counts;
}

function laneToPieKey(lane: QlcvBoardLaneId): QlcvFivePieKey {
  if (lane === "lane_hoan_thanh") return "hoan_thanh";
  if (lane === "lane_da_huy") return "huy";
  if (lane === "lane_qua_han") return "qua_han";
  if (lane === "lane_dang_lam") return "dang_lam";
  return "cho_xu_ly";
}

export const QLCV_FIVE_PIE_META: { key: QlcvFivePieKey; label: string; color: string }[] = [
  { key: "hoan_thanh", label: "Hoàn thành", color: "#059669" },
  { key: "huy", label: "Đã hủy (chỉ huy khoa)", color: "#64748b" },
  { key: "qua_han", label: "Quá hạn", color: "#dc2626" },
  { key: "dang_lam", label: "Đang làm", color: "#2563eb" },
  { key: "cho_xu_ly", label: "Chờ xử lý", color: "#a855f7" },
];
