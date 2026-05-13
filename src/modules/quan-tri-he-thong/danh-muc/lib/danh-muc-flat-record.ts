/**
 * Bản ghi danh mục phẳng (form / client). Không "use server" — import được từ Client Components.
 * CRUD & gateway: `danh-muc/actions/*.ts`.
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
