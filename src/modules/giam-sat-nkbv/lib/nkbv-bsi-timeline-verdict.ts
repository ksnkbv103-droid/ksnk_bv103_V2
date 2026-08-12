/**
 * Bridge draft timeline Primary BSI → evaluateBsiClabsi (SSOT §6) — không rule song song.
 * Index = ngày cấy máu; IWP±3; Secondary-before-CLABSI qua localized site context.
 */

import type { BsiVerificationData } from "../types/nkbv-verification";
import { evaluateBsiClabsi, type RuleEvaluationResult } from "./nkbv-rules-engine";
import type { BaGridSymptomByDate, BaGridXnCell } from "./nkbv-ba-grid-engine";
import { classifyPathogen } from "./nkbv-pathogen-rules";
import { organismsMatch } from "./nkbv-secondary-bsi-gate";
import {
  deviceAssociationFromCanThiepDates,
  resolveClinicalSbap,
  ssiSbapWindow,
} from "./nkbv-shared-timeline";
import {
  ageYearsFromNgaySinh,
  isInfantLe1FromAge,
} from "./nkbv-uti-timeline-verdict";

const FEVER_KEYS = ["fever", "fever_or_wbc"];
const CHILLS_KEYS = ["chills", "rigor"];
const HYPO_KEYS = ["hypotension", "shock"];
const INFANT_HYPO_KEYS = ["bsi_hypothermia", "infant_hypothermia", "hypothermia"];
const INFANT_APNEA_KEYS = ["bsi_apnea", "infant_apnea", "apnea"];
const INFANT_BRADY_KEYS = ["bsi_bradycardia", "infant_bradycardia", "bradycardia"];

function anyKeyInIwp(
  lamSang: BaGridSymptomByDate,
  iwpDates: Set<string>,
  keys: string[],
): boolean {
  for (const d of iwpDates) {
    const items = lamSang[d] || [];
    if (items.some((it) => keys.includes(it.key))) return true;
  }
  return false;
}

/** DOE LCBI1 ≈ blood; LCBI2/3 = sớm nhất triệu chứng hoặc máu ∈ IWP. */
export function resolveBsiDoe(input: {
  bloodDate: string;
  lamSang: BaGridSymptomByDate;
  iwpDates: Set<string>;
  pathogenType: "RECOGNIZED" | "COMMON_COMMENSAL";
}): string {
  const blood = input.bloodDate.slice(0, 10);
  if (input.pathogenType === "RECOGNIZED") return blood;

  const symptomKeys = [
    ...FEVER_KEYS,
    ...CHILLS_KEYS,
    ...HYPO_KEYS,
    ...INFANT_HYPO_KEYS,
    ...INFANT_APNEA_KEYS,
    ...INFANT_BRADY_KEYS,
  ];
  const dates: string[] = [];
  for (const d of input.iwpDates) {
    const items = input.lamSang[d] || [];
    if (items.some((it) => symptomKeys.includes(it.key))) dates.push(d);
  }
  if (input.iwpDates.has(blood)) dates.push(blood);
  dates.sort();
  return dates[0] || blood;
}

export function countCommensalBloodInIwp(
  indexXn: BaGridXnCell | null,
  bloodXn: BaGridXnCell[],
  iwpDates: Set<string>,
): { count: number; drawnSeparate: boolean } {
  if (!indexXn) return { count: 0, drawnSeparate: false };
  const org = indexXn.vi_khuan;
  const matches = bloodXn.filter(
    (b) =>
      iwpDates.has(b.ngay.slice(0, 10)) && organismsMatch(b.vi_khuan, org),
  );
  const dates = new Set(matches.map((b) => b.ngay.slice(0, 10)));
  return {
    count: Math.max(matches.length, 1),
    drawnSeparate: dates.size >= 2 || matches.length >= 2,
  };
}

export type BsiLocalizedSiteContext = {
  majorType: "UTI" | "PNEU" | "SSI" | "VAE" | "OTHER";
  criteriaMet: boolean;
  siteOrganism?: string | null;
  /** Site Index (XN/CĐHA) — dùng dựng clinical SBAP khi thiếu sbapStart/End. */
  siteIndexDate?: string;
  /** Site DOE/NSK. */
  siteDoe?: string;
  sbapStart?: string;
  sbapEnd?: string;
  bloodMandatory?: boolean;
};

export type BuildBsiTimelineVerdictInput = {
  indexXn: BaGridXnCell | null;
  bloodXn: BaGridXnCell[];
  lamSang: BaGridSymptomByDate;
  canThiepDates: string[];
  iwpDates: Set<string>;
  nsk: string | null;
  isInfantLe1?: boolean;
  /** Ngày vào viện — Day 1 CVC không trước VV. */
  admissionDate?: string | null;
  dischargeDate?: string | null;
  devicePlacedDate?: string | null;
  deviceRemovedDate?: string | null;
  localizedSite?: BsiLocalizedSiteContext | null;
  /** MBI stub — chỉ khi draft tick. */
  isNeutropenia?: boolean;
};

export type BsiTimelineGate = {
  pathogenType: "RECOGNIZED" | "COMMON_COMMENSAL";
  doe: string | null;
  hasFever: boolean;
  hasChills: boolean;
  hasHypotension: boolean;
  /** Số ngày lịch liên tục của đợt CVC gắn DOE (Day 1 = ngày đặt). */
  cvcPlacedDays: number;
  /** True chỉ khi ≥3 ngày liên tục + hiện diện DOE hoặc rút DOE−1. */
  cvcAssociated: boolean;
  warnings: string[];
};

export type BsiTimelineVerdict = {
  gate: BsiTimelineGate;
  data: BsiVerificationData;
  result: RuleEvaluationResult;
  criteriaMet: boolean;
  ketLuanLabel: string;
};

export function buildBsiTimelineVerdict(
  input: BuildBsiTimelineVerdictInput,
): BsiTimelineVerdict {
  const warnings: string[] = [];
  const bloodDate = input.indexXn?.ngay.slice(0, 10) || "";
  const pathogen = input.indexXn?.vi_khuan || "";
  if (!input.indexXn) warnings.push("Thiếu Index cấy máu");
  if (!pathogen || pathogen === "—") warnings.push("Thiếu tác nhân máu");

  const cls = classifyPathogen(pathogen);
  const pathogenType = cls.suggestedType;
  const commensal = countCommensalBloodInIwp(
    input.indexXn,
    input.bloodXn.length ? input.bloodXn : input.indexXn ? [input.indexXn] : [],
    input.iwpDates,
  );

  const hasFever = anyKeyInIwp(input.lamSang, input.iwpDates, FEVER_KEYS);
  const hasChills = anyKeyInIwp(input.lamSang, input.iwpDates, CHILLS_KEYS);
  const hasHypotension = anyKeyInIwp(input.lamSang, input.iwpDates, HYPO_KEYS);
  const hasInfantHypo = anyKeyInIwp(input.lamSang, input.iwpDates, INFANT_HYPO_KEYS);
  const hasInfantApnea = anyKeyInIwp(input.lamSang, input.iwpDates, INFANT_APNEA_KEYS);
  const hasInfantBrady = anyKeyInIwp(input.lamSang, input.iwpDates, INFANT_BRADY_KEYS);

  const doe =
    input.nsk ||
    (bloodDate
      ? resolveBsiDoe({
          bloodDate,
          lamSang: input.lamSang,
          iwpDates: input.iwpDates,
          pathogenType,
        })
      : null);

  const cvcDates = input.canThiepDates.map((d) => d.slice(0, 10)).sort();
  const cvcAssoc = doe
    ? deviceAssociationFromCanThiepDates(input.canThiepDates, doe, {
        placedDate: input.devicePlacedDate || cvcDates[0] || null,
        removedDate: input.deviceRemovedDate || null,
        admissionDate: input.admissionDate,
        dischargeDate: input.dischargeDate,
      })
    : { placedDays: 0, activeOnEvent: false, associated: false };
  const cvcPlacedDays = cvcAssoc.placedDays;
  const cvcAssociated = cvcAssoc.associated;
  const placed =
    cvcAssoc.episodeStart || input.devicePlacedDate?.slice(0, 10) || cvcDates[0] || "";
  const removed =
    cvcAssoc.episodeRemoved !== undefined
      ? cvcAssoc.episodeRemoved
      : input.deviceRemovedDate?.slice(0, 10) || null;

  const site = input.localizedSite;
  const hasLocalized = Boolean(site?.criteriaMet);
  let bloodMatchesSite = false;
  let sbapStart = site?.sbapStart;
  let sbapEnd = site?.sbapEnd;
  if (hasLocalized && site) {
    bloodMatchesSite = organismsMatch(pathogen, site.siteOrganism || "");
    if (!sbapStart || !sbapEnd) {
      const siteDoe = (site.siteDoe || "").slice(0, 10);
      if (site.majorType === "SSI" && siteDoe) {
        const w = ssiSbapWindow(siteDoe);
        sbapStart = sbapStart || w.start;
        sbapEnd = sbapEnd || w.end;
      } else if (site.majorType !== "SSI" && siteDoe) {
        const w = resolveClinicalSbap({
          indexDate: site.siteIndexDate,
          doe: siteDoe,
        });
        sbapStart = sbapStart || w.start;
        sbapEnd = sbapEnd || w.end;
      }
    }
  }

  const siteType =
    site?.majorType === "UTI" ||
    site?.majorType === "PNEU" ||
    site?.majorType === "SSI"
      ? site.majorType
      : site?.majorType
        ? "OTHER"
        : undefined;

  const inSbap =
    Boolean(bloodDate && sbapStart && sbapEnd) &&
    bloodDate >= (sbapStart || "") &&
    bloodDate <= (sbapEnd || "");

  if (pathogenType === "COMMON_COMMENSAL" && !hasFever && !hasChills && !hasHypotension) {
    warnings.push("CoNS/commensal — thiếu triệu chứng LCBI ∈ IWP");
  }

  const data: BsiVerificationData = {
    is_fungi_respiratory: cls.isFungiRespiratory,
    pathogen_name: pathogen,
    pathogen_type: pathogenType,
    commensal_culture_count:
      pathogenType === "COMMON_COMMENSAL" ? commensal.count : 0,
    commensal_drawn_separate:
      pathogenType === "COMMON_COMMENSAL" ? commensal.drawnSeparate : false,
    symptoms_window_7days: hasFever || hasChills || hasHypotension,
    has_fever: hasFever,
    has_chills: hasChills,
    has_hypotension: hasHypotension,
    is_infant_le1: Boolean(input.isInfantLe1),
    has_hypothermia: hasInfantHypo,
    has_apnea: hasInfantApnea,
    has_bradycardia: hasInfantBrady,
    cvc_placed_days: cvcPlacedDays,
    // Chỉ true khi đủ eligibility gắn CLABSI (≥3d + DOE/DOE−1) — không dùng «có CVC 1 ngày»
    cvc_active_on_event: cvcAssociated,
    device_placed_date: placed || undefined,
    device_removed_date: removed || undefined,
    is_neutropenia: Boolean(input.isNeutropenia),
    is_intestinal_pathogen: cls.isIntestinal,
    has_localized_infection: hasLocalized,
    localized_pathogen_matches: bloodMatchesSite,
    is_in_sbap_window: inSbap,
    blood_mandatory_for_localized: Boolean(site?.bloodMandatory),
    localized_site_type: siteType,
    localized_pathogen_name: site?.siteOrganism || undefined,
    blood_collection_date: bloodDate || undefined,
    calculated_doe: doe || undefined,
    calculated_sbap_start: sbapStart,
    calculated_sbap_end: sbapEnd,
  };

  const result = evaluateBsiClabsi(data);
  const criteriaMet =
    result.is_positive &&
    result.classification !== "CONTAMINATION" &&
    result.classification !== "COMMUNITY_INFECTION";
  const ketLuanLabel = [
    result.classification,
    result.lcbi_type,
    result.is_positive ? undefined : result.reason.split(".")[0],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    gate: {
      pathogenType,
      doe,
      hasFever,
      hasChills,
      hasHypotension,
      cvcPlacedDays,
      cvcAssociated,
      warnings,
    },
    data,
    result,
    criteriaMet,
    ketLuanLabel,
  };
}

function addDay(iso: string, n: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export { ageYearsFromNgaySinh, isInfantLe1FromAge };
