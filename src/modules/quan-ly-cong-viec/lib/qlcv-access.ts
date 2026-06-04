import { getBoardLaneId, type CongViecBoardInput } from "./qlcv-board-lanes";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

/** Dòng fact / view có đủ trường để kiểm tra quyền CRUD nhiệm vụ gốc + lane quá hạn. */
export type QlcvTaskAccessRow = CongViecLike & {
  nguoi_tao_id?: string | null;
  nguoi_giao_viec_id?: string | null;
  trang_thai?: string | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

function rowAsBoardInput(row: QlcvTaskAccessRow): CongViecBoardInput {
  return row as CongViecBoardInput;
}

/** Lane UX «Quá hạn» — khớp `getBoardLaneId` (mã QUA_HAN / cờ view / hạn qua). */
export function isQlcvTaskInQuaHanLane(row: QlcvTaskAccessRow): boolean {
  return getBoardLaneId(rowAsBoardInput(row)) === "lane_qua_han";
}

/** Phiếu active đã giao (không còn đề xuất chờ duyệt). */
export function isDaGiaoChoPhuTrachThucHien(row: QlcvTaskAccessRow): boolean {
  if (isDeXuatChoDuyet(row)) return false;
  if (String(row.trang_thai || "") === "DA_HUY") return false;
  return row.is_active !== false;
}

/** Người phụ trách đang ở giai đoạn đã giao — không cho sửa/xóa nhiệm vụ gốc. */
export function assigneeBlockedFromTaskCrud(actorStaffId: string | null, row: QlcvTaskAccessRow): boolean {
  if (!actorStaffId || !row.nguoi_phu_trach_id) return false;
  if (String(actorStaffId) !== String(row.nguoi_phu_trach_id)) return false;
  // Bỏ qua chặn nếu người phụ trách đồng thời là người tạo hoặc người giao việc
  if (row.nguoi_tao_id && String(actorStaffId) === String(row.nguoi_tao_id)) return false;
  if (row.nguoi_giao_viec_id && String(actorStaffId) === String(row.nguoi_giao_viec_id)) return false;
  return isDaGiaoChoPhuTrachThucHien(row);
}

export type QlcvUiAccessFlags = {
  isRBACAdmin: boolean;
  hasDelete: boolean;
  hasEdit: boolean;
  hasCreate: boolean;
  hasApprove: boolean;
  actorStaffId: string | null;
};

/**
 * Xóa: quản trị / quyền `CONG_VIEC` delete luôn được.
 * Việc **quá hạn** (lane đỏ): không cho xóa “nháp” theo người tạo — cần quyền xóa hoặc quản trị (chỉ huy vận hành qua RBAC).
 */
export function canShowDeleteTask(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (isQlcvTaskInQuaHanLane(row) && !f.isRBACAdmin && !f.hasDelete) return false;
  return f.isRBACAdmin || f.hasDelete;
}

/** Sửa metadata form: người phụ trách đã nhận việc không được sửa nội dung gốc; chờ nghiệm thu vẫn sửa được (hạn/mô tả) nếu có quyền edit và không bị chặn phụ trách. */
export function canShowEditTaskMetadata(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (String(row.trang_thai || "") === "HOAN_THANH" || String(row.trang_thai || "") === "DA_HUY") return false;
  if (!(f.isRBACAdmin || f.hasEdit)) return false;
  if (!f.actorStaffId) return false;
  if (assigneeBlockedFromTaskCrud(f.actorStaffId, row)) return false;
  return true;
}

/**
 * Form báo cáo % — ẩn khi đề xuất chưa kích hoạt, khi chờ nghiệm thu (trừ quản trị chỉnh tay), hoặc đã đóng.
 */
export function canShowHoatDongProgressSection(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  const st = String(row.trang_thai || "");
  if (st === "HOAN_THANH" || st === "DA_HUY") return false;
  if (isDeXuatChoDuyet(row)) return false;
  if (isChoNghiemThuHoanThanh(row) && !f.isRBACAdmin) return false;
  return true;
}

export function canShowDeXuatButton(f: QlcvUiAccessFlags): boolean {
  return f.isRBACAdmin || f.hasCreate;
}

/** Tạo việc gốc trực tiếp (giao tổ / người phụ trách) — cấp trên / quyền sửa; khác với chỉ gửi đề xuất. */
export function canShowDirectCreateTask(f: QlcvUiAccessFlags): boolean {
  return f.isRBACAdmin || f.hasEdit;
}

/** Phê duyệt đề xuất / Kanban duyệt — `approve` hoặc `edit` (tương thích role cũ). */
export function canShowQlcvApproveActions(f: QlcvUiAccessFlags): boolean {
  return f.isRBACAdmin || f.hasApprove || f.hasEdit;
}
