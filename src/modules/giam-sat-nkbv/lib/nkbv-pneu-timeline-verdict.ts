/**
 * Bridge draft timeline PNEU → evaluateVaeVap(..., "PNEU") — không rule song song.
 */

import type { VaeVerificationData } from "../types/nkbv-verification";
import { evaluateVaeVap, type RuleEvaluationResult } from "./nkbv-rules-engine";
import {
  criteriaKeyToSymptomDateKey,
  type BaGridCdhaCell,
  type BaGridSymptomByDate,
  type BaGridXnCell,
} from "./nkbv-ba-grid-engine";
import type { NkbvCriteriaKey } from "./nkbv-criteria-matrix";
import { isDeviceAssociated } from "./nkbv-shared-timeline";
import { ageYearsFromNgaySinh } from "./nkbv-uti-timeline-verdict";

/** Triệu chứng hô hấp tại chỗ — đếm ≥2 cho PNU. */
const RESPIRATORY_CRITERIA_KEYS = new Set([
  "cough",
  "dyspnea",
  "tachypnea",
  "rales",
  "purulent_sputum",
  "new_purulent_sputum",
  "increased_secretions",
  "worsening_gas",
]);

const SYSTEMIC_FEVER_KEYS = new Set(["fever", "fever_or_wbc"]);

/** AMS ≥70 — ẩn catalog khi tuổi biết và <70. */
export const PNEU_AMS_CRITERIA_KEY = "altered_mental_ge70";

const RESP_SPECIMEN_RE = /ĐỜM|DOR|SPUTUM|ETA|BAL|HÔ HẤP|HO HAP|PHẾ|PHE|RESPIRAT|NỘI KHÍ|NOI KHI/i;

function anyKeyInIwp(
  lamSang: BaGridSymptomByDate,
  iwpDates: Set<string>,
  keys: Set<string> | string[],
): boolean {
  const want = keys instanceof Set ? keys : new Set(keys);
  for (const d of iwpDates) {
    const items = lamSang[d] || [];
    if (items.some((it) => want.has(it.key))) return true;
  }
  return false;
}

function countDistinctKeysInIwp(
  lamSang: BaGridSymptomByDate,
  iwpDates: Set<string>,
  keys: Set<string>,
): number {
  const found = new Set<string>();
  for (const d of iwpDates) {
    for (const it of lamSang[d] || []) {
      if (keys.has(it.key)) found.add(it.key);
    }
  }
  return found.size;
}

function imagingInIwp(cdha: BaGridCdhaCell[], iwpDates: Set<string>): BaGridCdhaCell[] {
  return cdha.filter((c) => {
    const d = c.ngay.slice(0, 10);
    if (!iwpDates.has(d)) return false;
    if (c.tieu_chuan_key === "abscess_imaging") return false;
    // Index/CĐHA phổi hoặc chưa gán key — coi là phim ngực
    return (
      !c.tieu_chuan_key ||
      c.tieu_chuan_key === "imaging_chest" ||
      c.loai?.toLowerCase().includes("xq") ||
      c.loai?.toLowerCase().includes("ct") ||
      /phổi|phoi|chest|ngực|nguc/i.test(c.mo_ta_benh_ly || "")
    );
  });
}

function isRespiratoryIndexXn(xn: BaGridXnCell | null): boolean {
  if (!xn) return false;
  return RESP_SPECIMEN_RE.test(xn.benh_pham || "");
}

function baseVaeStub(): Omit<
  VaeVerificationData,
  | "patient_age"
  | "vent_days"
  | "has_chest_imaging_abnormal"
  | "has_cardiopulmonary_disease_underlying"
  | "imaging_films_count"
  | "fever_or_wbc_abnormal"
  | "altered_mental_status_ge_70yo"
  | "respiratory_symptoms_count"
  | "microbiology_evidence"
> {
  return {
    has_stable_baseline_peep_fio2: false,
    peep_increase_ge_3: false,
    fio2_increase_ge_20: false,
    temp_fever_or_hypothermia: false,
    wbc_abnormal: false,
    new_antimicrobial_ge_4days: false,
    has_purulent_sputum_and_positive_culture: false,
    has_quantitative_culture_positive: false,
    has_respiratory_viral_or_pathogen_test_positive: false,
  };
}

export type BuildPneuTimelineVerdictInput = {
  indexKind: "XN" | "CDHA" | "TIEU_CHUAN";
  indexXn: BaGridXnCell | null;
  indexCdha: BaGridCdhaCell | null;
  cdha: BaGridCdhaCell[];
  lamSang: BaGridSymptomByDate;
  canThiepDates: string[];
  iwpDates: Set<string>;
  nsk: string | null;
  bloodCriterionIds: string[];
  bloodXn?: BaGridXnCell[];
  patientAge?: number | null;
  devicePlacedDate?: string | null;
  deviceRemovedDate?: string | null;
  /** Lớp 2 — bệnh tim phổi nền → cần ≥2 phim. */
  hasCardiopulmonaryDisease?: boolean;
};

export type PneuTimelineGate = {
  imagingCount: number;
  hasImaging: boolean;
  hasSystemic: boolean;
  hasLocalRespiratory: boolean;
  respiratoryCount: number;
  microbiology: "NONE" | "PNU2" | "PNU3";
  warnings: string[];
};

export type PneuTimelineVerdict = {
  gate: PneuTimelineGate;
  result: RuleEvaluationResult;
  criteriaMet: boolean;
  ketLuanLabel: string;
  data: VaeVerificationData;
};

export function buildPneuTimelineVerdict(
  input: BuildPneuTimelineVerdictInput,
): PneuTimelineVerdict {
  const doe =
    input.nsk ||
    input.indexCdha?.ngay.slice(0, 10) ||
    input.indexXn?.ngay.slice(0, 10) ||
    "";

  const films = imagingInIwp(input.cdha, input.iwpDates);
  // Index CDHA luôn tính dù mô tả trống
  if (
    input.indexKind === "CDHA" &&
    input.indexCdha &&
    !films.some((f) => f.id === input.indexCdha!.id) &&
    input.iwpDates.has(input.indexCdha.ngay.slice(0, 10))
  ) {
    films.push(input.indexCdha);
  }
  const imagingCount = Math.max(films.length, input.indexKind === "CDHA" ? 1 : 0);
  const hasImaging = imagingCount >= 1;

  const hasFeverOrWbc = anyKeyInIwp(input.lamSang, input.iwpDates, SYSTEMIC_FEVER_KEYS);
  const hasAms = anyKeyInIwp(input.lamSang, input.iwpDates, [PNEU_AMS_CRITERIA_KEY]);
  const hasSystemic = hasFeverOrWbc || hasAms;
  const respiratoryCount = countDistinctKeysInIwp(
    input.lamSang,
    input.iwpDates,
    RESPIRATORY_CRITERIA_KEYS,
  );
  const hasLocalRespiratory = respiratoryCount >= 2;

  const bloodIds = new Set(input.bloodCriterionIds);
  const bloodTicked = (input.bloodXn || []).some((b) => bloodIds.has(b.id));
  const respIndexPositive =
    isRespiratoryIndexXn(input.indexXn) &&
    Boolean(input.indexXn?.vi_khuan && input.indexXn.vi_khuan !== "—");
  const microbiology: PneuTimelineGate["microbiology"] =
    bloodTicked || respIndexPositive ? "PNU2" : "NONE";

  const ventDates = input.canThiepDates.map((d) => d.slice(0, 10)).sort();
  const placed = input.devicePlacedDate?.slice(0, 10) || ventDates[0] || "";
  const removed = input.deviceRemovedDate?.slice(0, 10) || null;
  let ventDays = 0;
  if (placed && doe) {
    ventDays = isDeviceAssociated({
      placedDate: placed,
      removedDate: removed,
      doe,
    }).placedDays;
  } else if (ventDates.length) {
    ventDays = ventDates.length;
  }

  // Map LS → optional symptom flags (criteriaKeyToSymptomDateKey)
  let hasNewCough = false;
  let hasPurulent = false;
  let hasRales = false;
  let hasWorsening = false;
  let hasDyspnea = false;
  let hasTachypnea = false;
  for (const d of input.iwpDates) {
    for (const it of input.lamSang[d] || []) {
      const sk = criteriaKeyToSymptomDateKey(it.key as NkbvCriteriaKey, {
        syndrome: "PNEU",
      });
      if (sk === "has_new_cough") hasNewCough = true;
      if (sk === "has_purulent_sputum_symptom") hasPurulent = true;
      if (sk === "has_rales_or_wheeze") hasRales = true;
      if (sk === "has_worsening_gas_exchange") hasWorsening = true;
      if (sk === "has_dyspnea") hasDyspnea = true;
      if (sk === "has_tachypnea") hasTachypnea = true;
    }
  }

  const age = input.patientAge != null && input.patientAge >= 0 ? input.patientAge : 45;
  const cardio = Boolean(input.hasCardiopulmonaryDisease);
  const needsTwo = cardio;
  const filmsForEngine = needsTwo ? imagingCount : Math.max(imagingCount, hasImaging ? 1 : 0);

  const data: VaeVerificationData = {
    ...baseVaeStub(),
    patient_age: age,
    vent_days: ventDays,
    device_placed_date: placed || undefined,
    device_removed_date: removed || undefined,
    pneu_trigger: input.indexKind === "CDHA" ? "IMAGING" : "CULTURE",
    has_chest_imaging_abnormal: hasImaging,
    has_cardiopulmonary_disease_underlying: cardio,
    imaging_films_count: filmsForEngine,
    fever_or_wbc_abnormal: hasFeverOrWbc,
    altered_mental_status_ge_70yo: hasAms,
    respiratory_symptoms_count: respiratoryCount,
    has_new_cough: hasNewCough,
    has_purulent_sputum_symptom: hasPurulent,
    has_rales_or_wheeze: hasRales,
    has_worsening_gas_exchange: hasWorsening,
    has_dyspnea: hasDyspnea,
    has_tachypnea: hasTachypnea,
    microbiology_evidence: microbiology,
    calculated_doe: doe || undefined,
    respiratory_organism: input.indexXn?.vi_khuan || undefined,
  };

  const result = evaluateVaeVap(data, "PNEU");
  const criteriaMet = result.is_positive;
  const ketLuanLabel = [
    result.classification,
    result.is_positive ? undefined : result.reason.split(".")[0],
  ]
    .filter(Boolean)
    .join(" · ");

  const warnings: string[] = [];
  if (!hasImaging) warnings.push("Thiếu CĐHA ngực bất thường ∈ IWP");
  else if (needsTwo && imagingCount < 2) warnings.push("Tim phổi nền — cần ≥2 phim ∈ IWP");
  if (!hasSystemic) warnings.push("Thiếu triệu chứng toàn thân (sốt/WBC hoặc AMS ≥70)");
  if (!hasLocalRespiratory) {
    warnings.push(`Thiếu triệu chứng hô hấp tại chỗ (cần ≥2, hiện ${respiratoryCount})`);
  }

  return {
    gate: {
      imagingCount,
      hasImaging,
      hasSystemic,
      hasLocalRespiratory,
      respiratoryCount,
      microbiology,
      warnings,
    },
    result,
    criteriaMet,
    ketLuanLabel,
    data,
  };
}

export function shouldShowPneuAmsInCatalog(ageYears: number | null): boolean {
  // Chưa có ngày sinh → hiện (IP tự quyết); biết tuổi <70 → ẩn
  if (ageYears == null) return true;
  return ageYears >= 70;
}

export { ageYearsFromNgaySinh };
