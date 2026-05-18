import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HINH_THUC_CHUYEN_TRACH,
  HINH_THUC_GIAM_SAT_CHEO,
  HINH_THUC_TU_GIAM_SAT,
} from "@/lib/supervision-policy";
import { isKnownHinhThucLabel, resolveCanonicalHinhThucLabel } from "@/lib/supervision-hinh-thuc-legacy";

export const HINH_THUC_GIAM_SAT_OPTIONS = [
  HINH_THUC_TU_GIAM_SAT,
  HINH_THUC_CHUYEN_TRACH,
  HINH_THUC_GIAM_SAT_CHEO,
] as const;
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
  is_bo_sung_nguoi_benh?: boolean;
  ma_nguoi_benh?: string;
  ten_nguoi_benh?: string;
  so_giuong_nguoi_benh?: string;
  hinh_thuc_id?: string | null;
  cach_thuc_id?: string | null;
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

export function normalizeGscModeFields(input: GscSessionInput) {
  const hinhRaw = String(input.hinh_thuc_giam_sat ?? "").trim();
  const hinh = resolveCanonicalHinhThucLabel(hinhRaw) || hinhRaw;
  const cach = String(input.cach_thuc_giam_sat ?? "").trim();
  const hinh_id = input.hinh_thuc_id || null;
  const cach_id = input.cach_thuc_id || null;

  if (!cach && !cach_id && LEGACY_CACH_THUC_VALUES.has(hinhRaw as CachOption)) {
    return { hinh: HINH_THUC_CHUYEN_TRACH, cach: hinhRaw, hinh_id: null, cach_id: null };
  }
  return { hinh, cach, hinh_id, cach_id };
}

export function validateGscModeFields(hinh: string, cach: string) {
  if (!isKnownHinhThucLabel(hinh)) {
    throw new Error(
      `Hình thức giám sát không hợp lệ (${HINH_THUC_TU_GIAM_SAT} / ${HINH_THUC_CHUYEN_TRACH} / ${HINH_THUC_GIAM_SAT_CHEO}).`,
    );
  }
  if (!CACH_THUC_GIAM_SAT_OPTIONS.includes(cach as CachOption)) {
    throw new Error("Cách thức giám sát không hợp lệ (tại chỗ / trực tiếp qua camera / giám sát lại qua camera).");
  }
}

/** Resolve FK hình thức / cách thức khi chỉ có nhãn (sau DROP cột text trên phiên). */
export async function resolveGscModeIds(
  supabase: SupabaseClient,
  params: { hinh: string; cach: string; hinh_id?: string | null; cach_id?: string | null },
): Promise<{ hinh_thuc_id: string | null; cach_thuc_id: string | null }> {
  let hinh_thuc_id = params.hinh_id ?? null;
  let cach_thuc_id = params.cach_id ?? null;
  if (!hinh_thuc_id && params.hinh) {
    const { data } = await supabase
      .from("dm_hinh_thuc_giam_sat")
      .select("id")
      .eq("ten_hinh_thuc", params.hinh)
      .maybeSingle();
    hinh_thuc_id = data?.id ? String(data.id) : null;
  }
  if (!cach_thuc_id && params.cach) {
    const { data } = await supabase
      .from("dm_cach_thuc_giam_sat")
      .select("id")
      .eq("ten_cach_thuc", params.cach)
      .maybeSingle();
    cach_thuc_id = data?.id ? String(data.id) : null;
  }
  return { hinh_thuc_id, cach_thuc_id };
}

import { calculateGscComplianceScore } from "@/lib/domain/giam-sat-chung.domain";

export const calculateScore = calculateGscComplianceScore;
