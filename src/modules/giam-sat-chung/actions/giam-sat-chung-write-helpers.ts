import { ChecklistResult } from "@/types/giam-sat-chung";
import { HINH_THUC_KHACH_QUAN, HINH_THUC_TU_GIAM_SAT } from "@/lib/supervision-policy";

export const HINH_THUC_GIAM_SAT_OPTIONS = [HINH_THUC_TU_GIAM_SAT, HINH_THUC_KHACH_QUAN] as const;
export const CACH_THUC_GIAM_SAT_OPTIONS = [
  "Giám sát trực tiếp tại chỗ",
  "Giám sát trực tiếp qua camera",
  "Giám sát lại qua camera",
] as const;
export const LEGACY_CACH_THUC_VALUES = new Set(CACH_THUC_GIAM_SAT_OPTIONS);
export type ModeOption = (typeof HINH_THUC_GIAM_SAT_OPTIONS)[number];
export type CachOption = (typeof CACH_THUC_GIAM_SAT_OPTIONS)[number];
export type GscSessionInput = Record<string, unknown> & {
  khoa_id?: string;
  khu_vuc_id?: string;
  nghe_nghiep_id?: string;
  nguoi_giam_sat_id?: string;
  nhan_vien_id?: string;
  /** Cho phép nhập tay tên đối tượng khi không có hồ sơ mdm_nhan_su. */
  is_manual_nhan_vien?: boolean;
  ten_manual_nhan_vien?: string;
};
export type ExistingSessionRow = { id?: string };

export function parseNgayGiamSatOrNull(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : s;
}

/** Chuẩn hóa FK UUID tùy chọn khi đọc từ dòng import (unknown). */
export function optionalFkFromUnknown(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") return raw.trim() || null;
  return String(raw).trim() || null;
}

export function normalizeGscModeFields(input: Record<string, unknown>) {
  const hinh = String(input.hinh_thuc_giam_sat ?? "").trim();
  const cach = String(input.cach_thuc_giam_sat ?? "").trim();
  if (!cach && LEGACY_CACH_THUC_VALUES.has(hinh as CachOption)) {
    return { hinh: "Giám sát khách quan", cach: hinh };
  }
  return { hinh, cach };
}

export function validateGscModeFields(hinh: string, cach: string) {
  if (!HINH_THUC_GIAM_SAT_OPTIONS.includes(hinh as ModeOption)) {
    throw new Error("Hình thức giám sát không hợp lệ (Tự giám sát / Giám sát khách quan).");
  }
  if (!CACH_THUC_GIAM_SAT_OPTIONS.includes(cach as CachOption)) {
    throw new Error("Cách thức giám sát không hợp lệ (tại chỗ / trực tiếp qua camera / giám sát lại qua camera).");
  }
}

import { calculateGscComplianceScore } from "@/lib/domain/giam-sat-chung.domain";

export const calculateScore = calculateGscComplianceScore;
