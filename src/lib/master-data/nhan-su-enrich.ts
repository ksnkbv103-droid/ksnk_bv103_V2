/**
 * Gắn nhãn chức danh / chức vụ / vai trò dm_* cho hàng ho_so_nhan_vien (dùng màn giám sát, không phụ thuộc getNhanSus phân trang).
 */
import {
  LOAI_CHUC_DANH,
  LOAI_CHUC_VU,
  LOAI_TO_CONG_TAC,
  LOAI_VAI_TRO_HE_THONG_KSNK,
} from "@/modules/quan-tri-he-thong/nhan-su/actions/data";

export type HoSoRow = Record<string, unknown>;

export async function enrichHoSoForSupervisionUi(supabase: any, rows: HoSoRow[]): Promise<HoSoRow[]> {
  if (!rows?.length) return [];
  const dmIds = rows.flatMap((x) => [
    String(x.to_id || "").trim(),
    String(x.chuc_danh_id || "").trim(),
    String(x.chuc_vu_id || "").trim(),
    String(x.vai_tro_he_thong_id || "").trim(),
    String((x as { nghe_nghiep_id?: string }).nghe_nghiep_id || "").trim(),
  ]).filter(Boolean);
  const uniq = Array.from(new Set(dmIds));

  const [toRows, chucVuRows, chucDanhRows, vaiTroRows, ngheRows] = await Promise.all([
    uniq.length
      ? supabase.from("dm_to_cong_tac").select("id, ten_to").in("id", uniq)
      : Promise.resolve({ data: [], error: null }),
    uniq.length
      ? supabase.from("dm_chuc_vu").select("id, ten_chuc_vu").in("id", uniq)
      : Promise.resolve({ data: [], error: null }),
    uniq.length
      ? supabase.from("dm_chuc_danh").select("id, ten_chuc_danh").in("id", uniq)
      : Promise.resolve({ data: [], error: null }),
    uniq.length
      ? supabase.from("dm_roles").select("id, name").in("id", uniq)
      : Promise.resolve({ data: [], error: null }),
    uniq.length
      ? supabase.from("dm_nghe_nghiep").select("id, ten_nghe_nghiep").in("id", uniq)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (toRows.error) throw toRows.error;
  if (chucVuRows.error) throw chucVuRows.error;
  if (chucDanhRows.error) throw chucDanhRows.error;
  if (vaiTroRows.error) throw vaiTroRows.error;
  if (ngheRows.error) throw ngheRows.error;

  const toMap = new Map((toRows.data || []).map((r: any) => [String(r.id || ""), String(r.ten_to || "")]));
  const cvMap = new Map((chucVuRows.data || []).map((r: any) => [String(r.id || ""), String(r.ten_chuc_vu || "")]));
  const cdMap = new Map((chucDanhRows.data || []).map((r: any) => [String(r.id || ""), String(r.ten_chuc_danh || "")]));
  const vtMap = new Map((vaiTroRows.data || []).map((r: any) => [String(r.id || ""), String(r.name || "")]));
  const nnMap = new Map((ngheRows.data || []).map((r: any) => [String(r.id || ""), String(r.ten_nghe_nghiep || "")]));

  const resolve = (idRaw: unknown, loai: string) => {
    const id = String(idRaw || "").trim();
    if (!id) return undefined;
    if (loai === LOAI_TO_CONG_TAC) return toMap.get(id);
    if (loai === LOAI_CHUC_VU) return cvMap.get(id);
    if (loai === LOAI_CHUC_DANH) return cdMap.get(id);
    if (loai === LOAI_VAI_TRO_HE_THONG_KSNK) return vtMap.get(id);
    return undefined;
  };

  return rows.map((x) => ({
    ...x,
    chuc_danh: resolve(x.chuc_danh_id, LOAI_CHUC_DANH) ?? x.chuc_danh,
    chuc_vu: resolve(x.chuc_vu_id, LOAI_CHUC_VU) ?? x.chuc_vu,
    vai_tro_he_thong_ksnk: resolve(x.vai_tro_he_thong_id, LOAI_VAI_TRO_HE_THONG_KSNK) ?? x.vai_tro_he_thong_ksnk,
    ten_nghe_nghiep_dm: nnMap.get(String((x as { nghe_nghiep_id?: string }).nghe_nghiep_id || "").trim()),
  }));
}

/** Lọc nhân viên theo dm_nghe_nghiệp đã chọn: Chuẩn hóa tiếng Việt + So sánh ID + Fuzzy match */
export function matchesNhanSuProfessionFilter(
  ns: HoSoRow,
  selectedNgheId: string,
  ngheOptions: { id?: string; ten_danh_muc?: string }[],
): boolean {
  const selectedId = String(selectedNgheId || "").trim();
  if (!selectedId) return true;

  // 1. So sánh ID trực tiếp (Ưu tiên cao nhất)
  const nnFk = String(ns.nghe_nghiep_id || "").trim();
  if (nnFk && nnFk === selectedId) return true;

  // 2. So sánh theo Tên (Fuzzy Match) - Chuẩn hóa tiếng Việt để tránh sai lệch dấu/kiểu chữ
  const opt = ngheOptions.find((n) => String(n.id) === selectedId);
  const rawLabel = String(opt?.ten_danh_muc || "").trim();
  if (!rawLabel) {
    // Nếu có selectedId mà không tìm thấy trong options -> Chỉ khớp nếu ID trùng (đã check ở trên)
    return false;
  }

  const normalizeStr = (s: string) => 
    s.toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/đ/g, "d")
     .replace(/Đ/g, "d")
     .trim();

  const label = normalizeStr(rawLabel);
  const tenNnDm = normalizeStr(String(ns.ten_nghe_nghiep_dm || ""));
  const chucDanh = normalizeStr(String(ns.chuc_danh || ""));
  const chucVu = normalizeStr(String(ns.chuc_vu || ""));

  // Kiểm tra khớp tên danh mục
  if (tenNnDm && (tenNnDm === label || tenNnDm.includes(label) || label.includes(tenNnDm))) return true;

  // Kiểm tra khớp trong Chức danh / Chức vụ
  if (label && (chucDanh.includes(label) || chucVu.includes(label))) return true;

  return false;
}

export function formatNhanSuOptionLabel(ns: HoSoRow): string {
  const ten = String(ns.ho_ten || "").trim();
  const ma = String(ns.ma_nv || "").trim() || "N/A";
  const cv = String(ns.chuc_vu || "").trim();
  const cd = String(ns.chuc_danh || "").trim();
  const job = [cd, cv].filter(Boolean).join(" · ");
  return job ? `${ten} (${ma}) — ${job}` : `${ten} (${ma})`;
}
