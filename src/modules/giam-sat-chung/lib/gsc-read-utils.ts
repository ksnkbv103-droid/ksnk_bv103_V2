// src/modules/giam-sat-chung/lib/gsc-read-utils.ts
import { gscSessionDisplayRef } from "./gsc-display-ref";
import { format } from "date-fns";

export type GscHistoryRow = Record<string, unknown> & {
  id: string;
  loai_bang_kiem?: string;
  /** Từ view JOIN dm_bang_kiem — tên hiển thị lịch sử */
  ten_bang_kiem_hien_thi?: string;
  bang_kiem_label?: string;
  ngay_giam_sat?: string;
  thoi_gian_ghi_nhan?: string;
  khoa_name: string;
  khu_name: string;
  gs_ho_ten: string;
  ma_hien_thi: string;
  date_str: string;
};

export function enrichGscHistoryRows(rows: Record<string, unknown>[]): GscHistoryRow[] {
  return rows.map((row) => {
    const id = String(row.id);
    const ngayRaw = row.ngay_giam_sat ? String(row.ngay_giam_sat) : "";
    const dateNorm = ngayRaw && !ngayRaw.includes("T") ? `${ngayRaw}T12:00:00` : ngayRaw;
    let dateLabel = "—";
    if (dateNorm) {
      const parsed = new Date(dateNorm);
      dateLabel = Number.isFinite(parsed.getTime()) ? format(parsed, "dd/MM/yyyy") : "—";
    }

    const khoaNameFlat = String(row.ten_khoa_phong || "").trim();
    const khuNameFlat = String(row.ten_khu_vuc_giam_sat || "").trim();
    const nguoiGsFlat = String(row.ten_nguoi_giam_sat || "").trim();
    const nhanVienFlat = String(row.ten_nhan_vien || "").trim();
    const ngheFlat = String(row.ten_nghe_nghiep || "").trim();
    const tenBkDm = String(row.ten_bang_kiem_hien_thi || "").trim();
    const loaiRaw = String(row.loai_bang_kiem || "").trim();
    const bangKiemLabel = tenBkDm || loaiRaw || "—";
    return {
      ...row,
      id,
      bang_kiem_label: bangKiemLabel,
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
