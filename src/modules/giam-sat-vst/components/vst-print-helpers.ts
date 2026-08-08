/** Hàm định dạng & tra cứu hiển thị cho phiếu in VST — tách khỏi component để giữ file < 180 dòng. */

import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";

export { formatDateVi };

export function formatDtVi(iso: string | undefined): string {
  return formatDateTimeVi(iso);
}

export function tenNhanVien(
  p: { nhan_vien_id?: string; is_manual?: boolean; ten_manual?: string },
  nhanSus: Array<{ id?: string; ho_ten?: string }>,
): string {
  if (p.is_manual && String(p.ten_manual || "").trim()) return String(p.ten_manual).trim();
  if (!p.nhan_vien_id && String(p.ten_manual || "").trim()) return String(p.ten_manual).trim();
  const id = String(p.nhan_vien_id || "");
  if (!id) return "—";
  const row = nhanSus.find((n) => String(n.id) === id);
  const ten = String(row?.ho_ten || "").trim();
  return ten || id;
}

export function tenNghe(
  p: { nghe_nghiep?: string; nghe_nghiep_id?: string },
  ngheNghieps: Array<{ id?: string; ten_danh_muc?: string }>,
): string {
  const text = String(p.nghe_nghiep || "").trim();
  if (text) return text;
  const nid = String(p.nghe_nghiep_id || "");
  if (!nid) return "—";
  return ngheNghieps.find((x) => String(x.id) === nid)?.ten_danh_muc || "—";
}
