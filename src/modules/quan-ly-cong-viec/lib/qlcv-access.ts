import { getBoardLaneId, type CongViecBoardInput } from "./qlcv-board-lanes";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

/** Dòng fact / view có đủ trường để kiểm tra quyền CRUD nhiệm vụ gốc + lane quá hạn. */
export type QlcvTaskAccessRow = CongViecLike & {
  nguoi_tao_id?: string | null;
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

/**
 * Việc đã giao cho phụ trách thực hiện (không còn đề xuất chờ duyệt, không còn “bản nháp chưa gán người”).
 * Khi true: người phụ trách không được sửa/xóa metadata nhiệm vụ gốc (tiến độ vẫn qua HoatDongForm).
 */
export function isDaGiaoChoPhuTrachThucHien(row: QlcvTaskAccessRow): boolean {
  if (isDeXuatChoDuyet(row)) return false;
  const st = String(row.trang_thai || "");
  if (st === "DA_HUY") return false;
  if (st === "MOI" && row.is_active && !row.nguoi_phu_trach_id) return false;
  if (st === "CHUA_BAT_DAU" && row.is_active && !row.nguoi_phu_trach_id) return false;
  return true;
}

/** Người phụ trách đang ở giai đoạn đã giao — không cho sửa/xóa nhiệm vụ gốc. */
export function assigneeBlockedFromTaskCrud(actorStaffId: string | null, row: QlcvTaskAccessRow): boolean {
  if (!actorStaffId || !row.nguoi_phu_trach_id) return false;
  if (String(actorStaffId) !== String(row.nguoi_phu_trach_id)) return false;
  return isDaGiaoChoPhuTrachThucHien(row);
}

/**
 * Người tạo / người gửi đề xuất được xóa (không cần quyền delete module), trong phạm vi an toàn.
 */
export function creatorMayDeleteOwnTask(actorStaffId: string | null, row: QlcvTaskAccessRow): boolean {
  if (!actorStaffId || !row.nguoi_tao_id) return false;
  if (String(actorStaffId) !== String(row.nguoi_tao_id)) return false;
  if (isDeXuatChoDuyet(row)) return true;
  if (String(row.trang_thai || "") === "DA_HUY") return true;
  if (row.is_active && String(row.trang_thai || "") === "MOI" && !row.nguoi_phu_trach_id) return true;
  if (row.is_active && String(row.trang_thai || "") === "CHUA_BAT_DAU" && !row.nguoi_phu_trach_id) return true;
  return false;
}

export type QlcvUiAccessFlags = {
  isRBACAdmin: boolean;
  hasDelete: boolean;
  hasEdit: boolean;
  hasCreate: boolean;
  actorStaffId: string | null;
};

/**
 * Xóa: quản trị / quyền `CONG_VIEC` delete luôn được.
 * Việc **quá hạn** (lane đỏ): không cho xóa “nháp” theo người tạo — cần quyền xóa hoặc quản trị (chỉ huy vận hành qua RBAC).
 */
export function canShowDeleteTask(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (f.isRBACAdmin || f.hasDelete) return true;
  if (!f.actorStaffId) return false;
  if (assigneeBlockedFromTaskCrud(f.actorStaffId, row)) return false;
  if (isQlcvTaskInQuaHanLane(row)) return false;
  return creatorMayDeleteOwnTask(f.actorStaffId, row);
}

/** Sửa metadata form: người phụ trách đã nhận việc không được sửa nội dung gốc; chờ nghiệm thu vẫn sửa được (hạn/mô tả) nếu có quyền edit và không bị chặn phụ trách. */
export function canShowEditTaskMetadata(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (String(row.trang_thai || "") === "HOAN_THANH" || String(row.trang_thai || "") === "DA_HUY") return false;
  if (!(f.isRBACAdmin || f.hasEdit)) return false;
  if (!f.actorStaffId) return false;
  if (assigneeBlockedFromTaskCrud(f.actorStaffId, row)) return false;
  return true;
}

/** Không tạo việc con khi đề xuất chưa phê hoặc đang chờ nghiệm thu / đã đóng. */
export function canShowCreateSubTask(row: QlcvTaskAccessRow, _f: QlcvUiAccessFlags): boolean {
  const st = String(row.trang_thai || "");
  if (st === "HOAN_THANH" || st === "DA_HUY") return false;
  if (isDeXuatChoDuyet(row)) return false;
  if (isChoNghiemThuHoanThanh(row)) return false;
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
