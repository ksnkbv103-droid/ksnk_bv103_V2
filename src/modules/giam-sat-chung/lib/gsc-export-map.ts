import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import {
  isGscNhatKyCach,
  resolveGscHistoryCompliancePercent,
} from "./gsc-score-display";

export type GscExportRow = {
  id: string;
  ngay_giam_sat: string | null;
  khoa: string | null;
  ten_khu_vuc: string | null;
  ten_bang_kiem: string | null;
  loai_bang_kiem: string | null;
  ten_nguoi_giam_sat: string | null;
  ten_nhan_vien: string | null;
  ten_nghe_nghiep: string | null;
  so_dat: number | null;
  so_tieu_chi_co_ap_dung: number | null;
  /** Một % SSOT — khớp lịch sử (Đạt ÷ áp dụng, 2 chữ số). Nhật ký = trống. */
  ty_le_tuan_thu: number | null;
  ghi_chu_ty_le: string;
  hinh_thuc: string | null;
  cach_thuc: string | null;
};

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  return v != null ? String(v) : null;
}

/** GSC-6: một cột %; không xuất điểm lúc lưu cạnh đếm live. */
export function mapGscSessionToExportRow(r: Record<string, unknown>): GscExportRow {
  const nhatKy = isGscNhatKyCach(r.cach_tinh_diem, r.loai_giam_sat);
  const khoaLabel = formatKhoaCompactLabel({
    ma_khoa: strOrNull(r.ma_khoa_phong),
    ten_khoa: strOrNull(r.ten_khoa_phong),
  });

  return {
    id: String(r.id ?? ""),
    ngay_giam_sat: strOrNull(r.ngay_giam_sat),
    khoa: khoaLabel === "—" ? null : khoaLabel,
    ten_khu_vuc: strOrNull(r.ten_khu_vuc_giam_sat),
    ten_bang_kiem: strOrNull(r.ten_bang_kiem_hien_thi),
    loai_bang_kiem: strOrNull(r.loai_bang_kiem),
    ten_nguoi_giam_sat: strOrNull(r.ten_nguoi_giam_sat),
    ten_nhan_vien: strOrNull(r.ten_nhan_vien),
    ten_nghe_nghiep: strOrNull(r.ten_nghe_nghiep),
    so_dat: numOrNull(r.tong_dat),
    so_tieu_chi_co_ap_dung: numOrNull(r.tong_quan_sat),
    ty_le_tuan_thu: nhatKy ? null : resolveGscHistoryCompliancePercent(r, "TY_LE"),
    ghi_chu_ty_le: nhatKy
      ? "Nhật ký — không tính %"
      : "Đạt ÷ tiêu chí có áp dụng, 2 chữ số",
    hinh_thuc: strOrNull(r.ten_hinh_thuc_danh_muc),
    cach_thuc: strOrNull(r.ten_cach_thuc_danh_muc),
  };
}
