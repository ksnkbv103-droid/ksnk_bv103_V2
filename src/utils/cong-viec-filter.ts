// src/utils/cong-viec-filter.ts
// Bộ lọc dùng chung cho module Quản lý công việc.

/** Cột Kanban chính — khớp dm_trang_thai_cong_viec (migration seed). */
export const MAIN_KANBAN_COLUMN_IDS = [
  "DE_XUAT_CHO_DUYET",
  "DA_GIAO",
  "DANG_THUC_HIEN",
  "HOAN_THANH_CHO_PHE_DUYET",
  "HOAN_THANH",
] as const;

/**
 * Chuẩn hóa mã trạng thái: dữ liệu cũ có thể còn `DA_DUYET` trong khi DM dùng `DA_GIAO`.
 */
export function normalizeCongViecStatusCode(raw?: string | null): string {
  const s = String(raw ?? "").trim();
  if (s === "DA_DUYET") return "DA_GIAO";
  return s;
}

/** Bucket cột Kanban: một trong MAIN hoặc `__OTHER__` (tạm dừng, hủy, mã lạ…). */
export function getKanbanColumnId(trangThai?: string | null): string {
  const n = normalizeCongViecStatusCode(trangThai);
  if ((MAIN_KANBAN_COLUMN_IDS as readonly string[]).includes(n)) return n;
  return "__OTHER__";
}

export const STATUS_TABS = [
  "Tất cả",
  "Đề xuất chờ duyệt",
  "Đã duyệt",
  "Đang thực hiện",
  "Hoàn thành chờ phê duyệt",
  "Hoàn thành",
  "Tạm dừng",
  "Hủy",
] as const;

const STATUS_MAP: Record<string, string> = {
  "Đề xuất chờ duyệt": "DE_XUAT_CHO_DUYET",
  /** Đối chiếu DM: `DA_GIAO` (tab UI vẫn là “Đã duyệt”; mã legacy `DA_DUYET` được chuẩn hóa ở normalize). */
  "Đã duyệt": "DA_GIAO",
  "Đang thực hiện": "DANG_THUC_HIEN",
  "Hoàn thành chờ phê duyệt": "HOAN_THANH_CHO_PHE_DUYET",
  "Hoàn thành": "HOAN_THANH",
  "Tạm dừng": "TAM_DUNG",
  "Hủy": "HUY",
};

/** Tab lọc theo nhãn UI có khớp trạng thái phiếu hay không (sau normalize mã legacy). */
export function taskMatchesStatusTab(tab: string, rawTrangThai?: string | null): boolean {
  const mapped = STATUS_MAP[tab];
  if (!mapped) return true;
  return normalizeCongViecStatusCode(rawTrangThai) === mapped;
}

export function filterTasks(tasks: any[], statusTab: string, searchQuery: string) {
  const normalizedQuery = String(searchQuery || "").trim().toLowerCase();

  return (tasks || []).filter((task: any) => {
    const maTrangThai = task?.ma_trang_thai || task?.trang_thai;
    if (!taskMatchesStatusTab(statusTab, maTrangThai)) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      task?.ma_cong_viec,
      task?.ma_cv,
      task?.ten_cong_viec,
      task?.tieu_de,
      task?.mo_ta,
      task?.ten_nguoi_thuc_hien,
      task?.ten_nguoi_giao,
      task?.ten_nguoi_de_xuat,
      task?.ten_khoa_thuc_hien,
      task?.ten_to_cong_tac,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
