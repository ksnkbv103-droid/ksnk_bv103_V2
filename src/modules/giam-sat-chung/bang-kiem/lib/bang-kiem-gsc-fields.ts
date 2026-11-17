/**
 * BK-2: loại giám sát + cách tính điểm trên mẫu — khớp CHECK `gstt_dm_bang_kiem`
 * và chỗ GSC đọc (`loai_giam_sat`, `cach_tinh_diem`).
 */

import type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat } from "@/modules/giam-sat-chung/types";

export const BANG_KIEM_LOAI_GIAM_SAT = [
  "TUAN_THU",
  "NHAT_KY_VAN_HANH",
  "DANH_GIA_HE_THONG",
] as const satisfies readonly BangKiemLoaiGiamSat[];

export const BANG_KIEM_CACH_TINH_DIEM = [
  "TY_LE",
  "TRON_GOI",
  "DAT_KHONG_DAT",
  "NHAT_KY",
] as const satisfies readonly BangKiemCachTinhDiem[];

export const DEFAULT_BANG_KIEM_LOAI_GIAM_SAT: BangKiemLoaiGiamSat = "TUAN_THU";
export const DEFAULT_BANG_KIEM_CACH_TINH_DIEM: BangKiemCachTinhDiem = "TY_LE";

export const BANG_KIEM_LOAI_GIAM_SAT_LABEL: Record<BangKiemLoaiGiamSat, string> = {
  TUAN_THU: "Tuân thủ thực hành",
  NHAT_KY_VAN_HANH: "Nhật ký vận hành",
  DANH_GIA_HE_THONG: "Đánh giá hệ thống",
};

export const BANG_KIEM_CACH_TINH_DIEM_LABEL: Record<BangKiemCachTinhDiem, string> = {
  TY_LE: "Tỷ lệ tiêu chí (%)",
  TRON_GOI: "Trọn gói (mọi câu then chốt đạt)",
  DAT_KHONG_DAT: "Đạt / Không đạt",
  NHAT_KY: "Nhật ký (ghi số, không tính %)",
};

const LOAI_SET = new Set<string>(BANG_KIEM_LOAI_GIAM_SAT);
const CACH_SET = new Set<string>(BANG_KIEM_CACH_TINH_DIEM);

export function parseBangKiemLoaiGiamSat(raw: unknown): BangKiemLoaiGiamSat | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return LOAI_SET.has(v) ? (v as BangKiemLoaiGiamSat) : null;
}

export function parseBangKiemCachTinhDiem(raw: unknown): BangKiemCachTinhDiem | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return CACH_SET.has(v) ? (v as BangKiemCachTinhDiem) : null;
}

export function resolveBangKiemGscPersistFields(data: Record<string, unknown>):
  | { ok: true; loai_giam_sat: BangKiemLoaiGiamSat; cach_tinh_diem: BangKiemCachTinhDiem }
  | { ok: false; error: string } {
  const loai = parseBangKiemLoaiGiamSat(data.loai_giam_sat);
  const cach = parseBangKiemCachTinhDiem(data.cach_tinh_diem);
  if (!loai) {
    return {
      ok: false,
      error: "Vui lòng chọn loại giám sát (tuân thủ / nhật ký vận hành / đánh giá hệ thống).",
    };
  }
  if (!cach) {
    return { ok: false, error: "Vui lòng chọn cách tính điểm của mẫu." };
  }
  return { ok: true, loai_giam_sat: loai, cach_tinh_diem: cach };
}

export function labelBangKiemLoaiGiamSat(raw: unknown): string {
  const parsed = parseBangKiemLoaiGiamSat(raw);
  return parsed ? BANG_KIEM_LOAI_GIAM_SAT_LABEL[parsed] : "—";
}

export function labelBangKiemCachTinhDiem(raw: unknown): string {
  const parsed = parseBangKiemCachTinhDiem(raw);
  return parsed ? BANG_KIEM_CACH_TINH_DIEM_LABEL[parsed] : "—";
}
