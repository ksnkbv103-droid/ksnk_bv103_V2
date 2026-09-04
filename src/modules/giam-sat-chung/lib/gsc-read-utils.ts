// src/modules/giam-sat-chung/lib/gsc-read-utils.ts
import { gscSessionDisplayRef } from "./gsc-display-ref";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { parseGscBangKiemSnapshot } from "./gsc-bang-kiem-snapshot";

export type GscHistoryRow = Record<string, unknown> & {
  id: string;
  loai_bang_kiem?: string;
  /** Từ view JOIN gstt_dm_bang_kiem — tên hiển thị lịch sử */
  ten_bang_kiem_hien_thi?: string;
  bang_kiem_label?: string;
  ngay_giam_sat?: string;
  thoi_gian_ghi_nhan?: string;
  ma_khoa: string;
  khoa_name: string;
  khu_name: string;
  gs_ho_ten: string;
  ma_hien_thi: string;
  date_str: string;
};

/**
 * Gắn metadata/snapshot fact lên hàng view (view không lộ metadata).
 * Dùng trước enrich để `cach_tinh_diem` lịch sử ưu tiên snapshot.
 */
export function mergeGscHistoryRowsWithSessionMetadata(
  rows: Record<string, unknown>[],
  metaById: Map<string, unknown>,
): Record<string, unknown>[] {
  if (!metaById.size) return rows;
  return rows.map((row) => {
    const id = String(row.id ?? "").trim();
    if (!id || !metaById.has(id)) return row;
    return { ...row, metadata: metaById.get(id) };
  });
}

export function enrichGscHistoryRows(rows: Record<string, unknown>[]): GscHistoryRow[] {
  return rows.map((row) => {
    const id = String(row.id);
    const ngayRaw = row.ngay_giam_sat ? String(row.ngay_giam_sat) : "";
    const dateLabel = formatDateVi(ngayRaw ? ngayRaw.slice(0, 10) : null);

    const maKhoaFlat = String(row.ma_khoa_phong || "").trim();
    const khoaNameFlat = String(row.ten_khoa_phong || "").trim();
    const khuNameFlat = String(row.ten_khu_vuc_giam_sat || "").trim();
    const nguoiGsFlat = String(row.ten_nguoi_giam_sat || "").trim();
    const nhanVienFlat = String(row.ten_nhan_vien || "").trim();
    const ngheFlat = String(row.ten_nghe_nghiep || "").trim();
    const tenBkDm = String(row.ten_bang_kiem_hien_thi || "").trim();
    const loaiRaw = String(row.loai_bang_kiem || "").trim();
    const bangKiemLabel = tenBkDm || loaiRaw || "—";
    // Snapshot persist lúc ghi — ưu tiên hơn live JOIN (đổi mẫu BK không lệch nhãn lịch sử).
    const snap = parseGscBangKiemSnapshot(row.bang_kiem_snapshot ?? row.metadata);
    const snapCach = String(snap?.cach_tinh_diem ?? "").trim().toUpperCase();
    return {
      ...row,
      id,
      ...(snap ? { bang_kiem_snapshot: snap } : {}),
      // Fallback live chỉ khi thiếu snapshot (comment khớp formatGscHistoryScore).
      ...(snapCach ? { cach_tinh_diem: snapCach } : {}),
      bang_kiem_label: bangKiemLabel,
      ma_khoa: maKhoaFlat,
      khoa_name:
        khoaNameFlat ||
        String((row.danh_muc_khoa as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "").trim() ||
        "---",
      khu_name:
        khuNameFlat ||
        String((row.danh_muc_khu_vuc as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "").trim(),
      gs_ho_ten: nguoiGsFlat || (row.nguoi_giam_sat as { ho_ten?: string } | undefined)?.ho_ten || "",
      ten_nhan_vien_display:
        nhanVienFlat ||
        String((row.nhan_vien as { ho_ten?: string } | undefined)?.ho_ten || "").trim() ||
        String(row.ten_manual_nhan_vien || "").trim(),
      nghe_nghiep_name:
        ngheFlat ||
        String((row.danh_muc_nghe_nghiep as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "").trim(),
      ma_hien_thi: gscSessionDisplayRef(id, ngayRaw || null),
      date_str: dateLabel,
    } as GscHistoryRow;
  });
}
