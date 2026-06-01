/** Giá trị đánh giá từng tiêu chí trong bảng kiểm giám sát chung */
export type ChecklistResultValue = "DAT" | "KHONG_DAT" | "NA";

export interface ChecklistResult {
  criterionId: string;
  value: ChecklistResultValue;
  note?: string | null;
  weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  isRedFlag?: boolean;
  image_url?: string | null; // Đường dẫn ảnh bằng chứng sai phạm
  /** Anti-Hawthorne: timestamp captured khi user tick từng criterion. */
  thoi_diem_ghi?: string | null;
  /** Giá trị numeric khi kieu_du_lieu='SO_LIEU' (NHAT_KY). */
  gia_tri_so?: number | null;
  /** Giá trị enum khi kieu_du_lieu='LUA_CHON'. */
  gia_tri_lua_chon?: string | null;
}

export interface ChecklistCriterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore?: number;
  weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  isRedFlag?: boolean;
  // Slice 3 (reform v4): metadata mở rộng từ tieu_chi_jsonb.
  phan_muc?: string | null;
  kieu_du_lieu?: 'BOOLEAN' | 'LUA_CHON' | 'SO_LIEU';
  la_then_chot?: boolean;
  cho_phep_kpa?: boolean;
  cac_lua_chon?: string[] | null;
  ma_csv_goc?: string | null;
  pham_vi_tags?: readonly string[];
  nguong_min?: number | null;
  nguong_max?: number | null;
  don_vi?: string | null;
}

export interface ChecklistTemplate {
  id: string;
  dbId?: string;
  title: string;
  /** Nhóm hiển thị (tuỳ màn hình) */
  category?: string;
  criteria: ChecklistCriterion[];
}
