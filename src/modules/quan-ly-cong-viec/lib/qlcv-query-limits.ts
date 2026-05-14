/**
 * Giới hạn truy vấn danh sách — tránh tải không giới hạn view công việc trên UI Kanban/bảng.
 * (Nếu vượt ngưỡng, cần phân trang / tìm kiếm server-side.)
 */
export const QLCV_ROOT_TASK_LIST_MAX = 1500;
