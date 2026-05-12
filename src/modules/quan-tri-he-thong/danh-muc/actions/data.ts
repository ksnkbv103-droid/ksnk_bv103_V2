/**
 * Type danh mục phẳng (client/form). Ghi đọc server: các file `*.actions.ts` và gateway trong cùng thư mục.
 * Không nhân đôi logic CRUD mới tại đây — xem báo cáo cấu trúc BV103 (dual entry cleanup).
 */

/**
 * Tuyệt đối không để "use server" ở file này để có thể import type vào Client Components.
 */

export interface DanhMuc {
  id: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  loai_danh_muc: string;
  is_active?: boolean;
  is_system?: boolean;
  extra_data?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}
