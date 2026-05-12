import { type NhanSu } from "../types";

/** 
 * Gắn tên khoa / tổ / chức danh hiển thị cho danh sách có phân trang. 
 * Dữ liệu đã có sẵn trong View v_mdm_nhan_su_full.
 */
export async function enrichNhanSuListRows(
  rows: any[],
): Promise<NhanSu[]> {
  return rows.map((x) => ({
    ...x,
    khoa: x.khoa_id ? { id: x.khoa_id, ten_khoa: x.ten_khoa } : undefined,
    to: x.to_id ? { id: x.to_id, ten_danh_muc: x.ten_to } : undefined,
    nghe_nghiep: x.nghe_nghiep_id ? { id: x.nghe_nghiep_id, ten_nghe_nghiep: x.ten_nghe_nghiep || "" } : undefined,
    chuc_danh: x.ten_chuc_danh || x.chuc_danh,
    chuc_vu: x.ten_chuc_vu || x.chuc_vu,
    vai_tro_he_thong_ksnk: x.ten_vai_tro || x.vai_tro_he_thong_ksnk,
  }));
}
