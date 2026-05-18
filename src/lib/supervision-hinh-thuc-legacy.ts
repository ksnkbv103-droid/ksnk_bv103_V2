import {
  HINH_THUC_CHUYEN_TRACH,
  HINH_THUC_GIAM_SAT_CHEO,
  HINH_THUC_TU_GIAM_SAT,
} from "@/lib/supervision-policy";

/** Nhãn import CSV / DB cũ — đồng nghĩa Giám sát chuyên trách (KSNK khách quan). */
export const HINH_THUC_KHACH_QUAN_LEGACY = "Giám sát khách quan";

const norm = (v: string | null | undefined) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Các biến thể legacy → nhãn chuẩn `dm_hinh_thuc_giam_sat`. */
export function resolveCanonicalHinhThucLabel(raw: string | null | undefined): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (norm(t) === norm(HINH_THUC_KHACH_QUAN_LEGACY)) return HINH_THUC_CHUYEN_TRACH;
  return t;
}

export function isLegacyKhachQuanHinhThuc(raw: string | null | undefined): boolean {
  return norm(raw) === norm(HINH_THUC_KHACH_QUAN_LEGACY);
}

export function isKnownHinhThucLabel(raw: string | null | undefined): boolean {
  const canonical = resolveCanonicalHinhThucLabel(raw);
  return (
    canonical === HINH_THUC_CHUYEN_TRACH ||
    canonical === HINH_THUC_TU_GIAM_SAT ||
    canonical === HINH_THUC_GIAM_SAT_CHEO
  );
}
