/**
 * Taxonomy classification → major type NKBV.
 *
 * `classification` là output canonical của Rules Engine, được lưu vào
 * `nkbv_fact_su_kien.verification_data.classification` và là nguồn duy nhất
 * dựng tử số báo cáo. Không dùng `vi_tri_nhiem_khuan` (text tự do) cho việc này.
 *
 * Mirror SQL: `fn_nkbv_major_type_from_classification`
 * (migration 20260809170000). Spec `nkbv-classification-taxonomy.spec.ts`
 * chặn hai bên lệch nhau.
 */

import type { NkbvMajorType } from "./nkbv-major-type";

/** Classification dương tính nhóm BSI. */
export const NKBV_BSI_CLASSIFICATIONS = [
  "CLABSI",
  "MBI_LCBI",
  "PRIMARY_BSI_NON_CLABSI",
  "SECONDARY_BSI",
] as const;

/** Classification dương tính nhóm UTI. */
export const NKBV_UTI_CLASSIFICATIONS = [
  "CAUTI_SUTI",
  "CAUTI_SUTI_2",
  "CAUTI_ABUTI",
  "SUTI",
  "SUTI_2",
  "ABUTI",
] as const;

/** Classification dương tính nhóm VAE (Event Period 14 ngày, không IWP). */
export const NKBV_VAE_CLASSIFICATIONS = ["VAC", "IVAC", "PVAP"] as const;

/** Mã sự kiện NHSN của SSI (Organ/Space có thể kèm `:SITE`). */
export const NKBV_SSI_EVENT_CODES = ["SIP", "SIS", "DIP", "DIS"] as const;

/** PNU1/2/3 × VAP|HAP — nhánh viêm phổi, tách khỏi VAE. */
export const NKBV_PNEU_CLASSIFICATION_PATTERN = /^PNU[123]_(VAP|HAP)$/;

const BSI = new Set<string>(NKBV_BSI_CLASSIFICATIONS);
const UTI = new Set<string>(NKBV_UTI_CLASSIFICATIONS);
const VAE = new Set<string>(NKBV_VAE_CLASSIFICATIONS);
const SSI = new Set<string>(NKBV_SSI_EVENT_CODES);

/** Major type từ classification; `OTHER` cho mọi kết luận âm tính hoặc không rõ. */
export function nkbvMajorTypeFromClassification(
  classification: string | null | undefined,
): NkbvMajorType {
  const cls = String(classification || "").trim().toUpperCase();
  if (!cls) return "OTHER";
  if (BSI.has(cls)) return "BSI";
  if (UTI.has(cls)) return "UTI";
  if (VAE.has(cls)) return "VAE";
  if (NKBV_PNEU_CLASSIFICATION_PATTERN.test(cls)) return "PNEU";
  if (SSI.has(cls) || cls.startsWith("ORGAN_SPACE")) return "SSI";
  return "OTHER";
}

/** Ca đếm vào tử số VAP (viêm phổi trên bệnh nhân thở máy). */
export function isVapClassification(classification: string | null | undefined): boolean {
  return /^PNU[123]_VAP$/.test(String(classification || "").trim().toUpperCase());
}

/** Ca đếm vào tử số CAUTI (UTI liên quan sonde tiểu). */
export function isCautiClassification(classification: string | null | undefined): boolean {
  return String(classification || "").trim().toUpperCase().startsWith("CAUTI");
}
