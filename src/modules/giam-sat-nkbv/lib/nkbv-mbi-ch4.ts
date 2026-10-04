/**
 * NHSN Ch.4 MBI-LCBI — Soft 20e Domain A.
 * Thresholds/windows ONLY from Soft Soft line-check of
 * `nkbv-sources/extracted/cdc-ch4.txt` (Table 2 · Table 5).
 * Flag PO G.1#1 (confirm) · G.1#5 (MBI organism browser) — do not hard-code closed list.
 */

import { addDays, subDays } from "./nkbv-shared-timeline";

/** Cite: cdc-ch4.txt:425 — ANC and/or WBC values <500 cells/mm³ */
export const MBI_ANC_WBC_LT_CELLS_PER_MM3 = 500 as const;

/**
 * Cite: cdc-ch4.txt:425-427 · 441-443 · 896-897
 * Neutropenia window = blood collection date + 3 calendar days before + 3 after
 * (= 7 calendar days). Need ≥2 separate days with ANC and/or WBC <500.
 */
export const MBI_NEUTROPENIA_WINDOW_DAYS_BEFORE = 3 as const;
export const MBI_NEUTROPENIA_WINDOW_DAYS_AFTER = 3 as const;
export const MBI_NEUTROPENIA_MIN_SEPARATE_DAYS = 2 as const;

/**
 * Cite: cdc-ch4.txt:419-421
 * ≥1-liter diarrhea in 24h (or ≥20 mL/kg/24h if age <18) with onset on or within
 * 7 calendar days before the date the positive blood specimen was collected —
 * AND only under allogeneic HSCT within past year (criterion 1).
 */
export const MBI_DIARRHEA_LITERS_PER_24H = 1 as const;
export const MBI_DIARRHEA_ML_PER_KG_LT18 = 20 as const;
export const MBI_DIARRHEA_ONSET_DAYS_BEFORE_BLOOD = 7 as const;

/** Cite: cdc-ch4.txt:415 — allogeneic HSCT recipient within the past year */
export const MBI_ALLO_HSCT_WITHIN_YEARS = 1 as const;

export type MbiAncWbcSample = {
  /** YYYY-MM-DD collection calendar day */
  date: string;
  /** Absolute neutrophil count cells/mm³; omit if not done */
  anc?: number | null;
  /** WBC cells/mm³; omit if not done */
  wbc?: number | null;
};

export type MbiBarrierInput = {
  /**
   * Clinician attest: ≥2 separate days ANC and/or WBC <500 in blood±3d window
   * (cite 425-427). Preferred when raw series not wired yet.
   */
  anc_wbc_lt_500_ge_2d?: boolean;
  /**
   * Clinician attest Ch.4 criterion 1: allogeneic HSCT within past year with
   * Grade III/IV GI GVHD during same hospitalization (cite 415-418).
   * Collapsed tip field — Soft does not invent separate GVHD grade field this slice.
   */
  has_hsct_or_gvhd?: boolean;
  /**
   * Severe diarrhea (cite 419-421). Alone is NOT barrier — only with allogeneic HSCT
   * (criterion 1b). Tip P1 wrongly OR'd this standalone; Soft Soft corrects to Ch.4.
   */
  has_severe_diarrhea_mbi?: boolean;
  /** Optional raw ANC/WBC series — when present Soft Soft evaluates window (cite 425-427). */
  anc_wbc_samples?: MbiAncWbcSample[];
  /** Positive blood specimen collection date YYYY-MM-DD (Day 1 of neutropenia window). */
  blood_collection_date?: string | null;
};

export type MbiBarrierResult = {
  met: boolean;
  /** Which Ch.4 arm(s) met */
  arms: Array<"NEUTROPENIA" | "ALLO_HSCT_GVHD" | "ALLO_HSCT_DIARRHEA">;
  reason: string;
};

/** Cite: cdc-ch4.txt:425-427 · 896-897 — window bounds inclusive. */
export function mbiNeutropeniaWindow(bloodCollectionDate: string): {
  start: string;
  end: string;
} {
  const d = bloodCollectionDate.slice(0, 10);
  return {
    start: subDays(d, MBI_NEUTROPENIA_WINDOW_DAYS_BEFORE),
    end: addDays(d, MBI_NEUTROPENIA_WINDOW_DAYS_AFTER),
  };
}

/**
 * Cite: cdc-ch4.txt:425-427 · 441-443 · 874-875 · 896-897
 * Any combination of ANC and/or WBC <500 on separate calendar days within window.
 */
export function meetsMbiNeutropeniaFromSamples(
  samples: MbiAncWbcSample[],
  bloodCollectionDate: string,
): boolean {
  const blood = bloodCollectionDate.slice(0, 10);
  if (!blood) return false;
  const { start, end } = mbiNeutropeniaWindow(blood);
  const lowDays = new Set<string>();
  for (const s of samples) {
    const day = String(s.date || "").slice(0, 10);
    if (!day || day < start || day > end) continue;
    const ancOk =
      s.anc != null && Number.isFinite(Number(s.anc)) && Number(s.anc) < MBI_ANC_WBC_LT_CELLS_PER_MM3;
    const wbcOk =
      s.wbc != null && Number.isFinite(Number(s.wbc)) && Number(s.wbc) < MBI_ANC_WBC_LT_CELLS_PER_MM3;
    if (ancOk || wbcOk) lowDays.add(day);
  }
  return lowDays.size >= MBI_NEUTROPENIA_MIN_SEPARATE_DAYS;
}

/**
 * Ch.4 Table 2 barrier (cite 414-427):
 * (1) Allo HSCT ≤1y + (GI GVHD III/IV OR severe diarrhea in 7d before blood)
 *  OR
 * (2) Neutropenia (≥2 separate days ANC/WBC <500 in blood±3d)
 *
 * Diarrhea alone without HSCT → NOT barrier (tip P1 error Soft Soft corrects).
 * Cancer diagnosis alone → never (SSOT / DoD).
 */
export function evaluateMbiMucosalBarrier(input: MbiBarrierInput): MbiBarrierResult {
  const arms: MbiBarrierResult["arms"] = [];

  const neutropeniaFromSamples =
    Boolean(input.blood_collection_date) &&
    Array.isArray(input.anc_wbc_samples) &&
    input.anc_wbc_samples.length > 0 &&
    meetsMbiNeutropeniaFromSamples(
      input.anc_wbc_samples,
      String(input.blood_collection_date),
    );
  const neutropenia = Boolean(input.anc_wbc_lt_500_ge_2d) || neutropeniaFromSamples;
  if (neutropenia) arms.push("NEUTROPENIA");

  // Criterion 1a — collapsed tip attest has_hsct_or_gvhd = allo HSCT + GI GVHD III/IV
  if (Boolean(input.has_hsct_or_gvhd)) {
    arms.push("ALLO_HSCT_GVHD");
  }

  // Criterion 1b — diarrhea only WITH allo HSCT attest (same hospitalization / past year)
  // Soft Soft: tip field has_hsct_or_gvhd covers allo HSCT presence; diarrhea alone rejected.
  if (Boolean(input.has_hsct_or_gvhd) && Boolean(input.has_severe_diarrhea_mbi)) {
    if (!arms.includes("ALLO_HSCT_DIARRHEA")) arms.push("ALLO_HSCT_DIARRHEA");
  }

  const met = arms.length > 0;
  let reason: string;
  if (!met) {
    reason =
      "Thiếu bằng chứng hàng rào Ch.4: cần neutropenia (ANC/WBC <500 ≥2 ngày riêng trong cửa sổ máu±3 ngày) hoặc allo HSCT ≤1 năm + (GVHD GI III/IV hoặc tiêu chảy nặng). Tiêu chảy đơn / ung thư đơn không đủ MBI.";
  } else if (arms.includes("NEUTROPENIA")) {
    reason =
      "Rào MBI (CDC NHSN 2025, Ch.4): giảm bạch cầu ANC/WBC <500 ≥2 ngày lịch riêng trong cửa sổ ngày cấy máu (+) ±3 ngày.";
  } else if (arms.includes("ALLO_HSCT_DIARRHEA")) {
    reason =
      "Rào MBI (CDC NHSN 2025, Ch.4): ghép tủy ≤1 năm + tiêu chảy nặng (≥1 L/24h hoặc ≥20 mL/kg/24h) khởi phát trong 7 ngày trước cấy máu (+).";
  } else {
    reason =
      "Rào MBI (CDC NHSN 2025, Ch.4): ghép tủy ≤1 năm + GVHD đường tiêu hóa độ III/IV cùng đợt nằm viện.";
  }

  return { met, arms, reason };
}

/** MBI = LCBI already met + MBI-eligible organism + barrier. Organism list = G.1#5 (browser). */
export function isMbiEligibleOrganismFlag(isIntestinalPathogen: boolean): boolean {
  // Soft Soft: tip uses is_intestinal_pathogen as interim proxy — G.1#5 browser still open.
  // Do NOT invent closed NHSN MBI organism list this slice.
  return Boolean(isIntestinalPathogen);
}
