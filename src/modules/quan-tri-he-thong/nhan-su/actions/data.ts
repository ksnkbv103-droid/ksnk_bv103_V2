/** Hằng số + type phụ. CRUD / ghi DB: ưu tiên `nhan-su-*.actions.ts` (tránh nhân đôi entry mới ở đây). */

/** Mã loại danh_mục: vai trò trong hệ thống KSNK (không phải RBAC Postgres). */
export const LOAI_VAI_TRO_HE_THONG_KSNK = "VAI_TRO_HE_THONG_KSNK" as const;
/** Mã loại danh_mục tổ công tác (FK ho_so_nhan_vien.to_id). */
export const LOAI_TO_CONG_TAC = "TO_CONG_TAC" as const;
/** Mã loại danh_mục cho chức vụ (FK ho_so_nhan_vien.chuc_vu_id). */
export const LOAI_CHUC_VU = "CHUC_VU" as const;
/** Mã loại danh_mục cho chức danh (FK ho_so_nhan_vien.chuc_danh_id). */
export const LOAI_CHUC_DANH = "CHUC_DANH" as const;

import { NhanSu as ModuleNhanSu } from "../types";
export type NhanSu = ModuleNhanSu;
