import { isChoNhanViec, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

/** Dòng fact / view có đủ trường để kiểm tra quyền CRUD nhiệm vụ gốc. */
export type QlcvTaskAccessRow = CongViecLike & {
  nguoi_tao_id?: string | null;
  trang_thai?: string | null;
};

/**
 * Việc đã giao cho phụ trách thực hiện (không còn đề xuất chờ duyệt, không còn “bản nháp chưa gán người”).
 * Khi true: người phụ trách không được sửa/xóa metadata nhiệm vụ gốc (tiến độ vẫn qua HoatDongForm).
 */
export function isDaGiaoChoPhuTrachThucHien(row: QlcvTaskAccessRow): boolean {
  if (isDeXuatChoDuyet(row)) return false;
  const st = String(row.trang_thai || "");
  if (st === "DA_HUY") return false;
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

export function canShowDeleteTask(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (f.isRBACAdmin || f.hasDelete) return true;
  if (!f.actorStaffId) return false;
  if (assigneeBlockedFromTaskCrud(f.actorStaffId, row)) return false;
  return creatorMayDeleteOwnTask(f.actorStaffId, row);
}

export function canShowEditTaskMetadata(row: QlcvTaskAccessRow, f: QlcvUiAccessFlags): boolean {
  if (String(row.trang_thai || "") === "HOAN_THANH" || String(row.trang_thai || "") === "DA_HUY") return false;
  if (!(f.isRBACAdmin || f.hasEdit)) return false;
  if (!f.actorStaffId) return false;
  if (assigneeBlockedFromTaskCrud(f.actorStaffId, row)) return false;
  return true;
}

export function canShowDeXuatButton(f: QlcvUiAccessFlags): boolean {
  return f.isRBACAdmin || f.hasCreate;
}

/** Tạo việc gốc trực tiếp (giao tổ / người phụ trách) — cấp trên / quyền sửa; khác với chỉ gửi đề xuất. */
export function canShowDirectCreateTask(f: QlcvUiAccessFlags): boolean {
  return f.isRBACAdmin || f.hasEdit;
}
