/**
 * Lọc theo nghề nghiệp và nhãn hiển thị cho hàng ho_so_nhan_vien trên các màn giám sát.
 */

export type HoSoRow = Record<string, unknown>;

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
