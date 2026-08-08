/**
 * Bridge draft timeline SSI → evaluateSsi (SSOT) — không rule song song.
 * Không IWP±3; Index = ngày mổ / TC SSI; SP 30/90; SBAP = ssiSbapWindow(DOE).
 */

import type { SsiVerificationData } from "../types/nkbv-verification";
import { evaluateSsi, type RuleEvaluationResult } from "./nkbv-rules-engine";
import type { BaGridCdhaCell, BaGridSymptomByDate, BaGridXnCell } from "./nkbv-ba-grid-engine";
import { organismsMatch } from "./nkbv-secondary-bsi-gate";
import { addDays, daysBetween, ssiSbapWindow } from "./nkbv-shared-timeline";
import {
  defaultSsiEventTypeForDepth,
  depthFromSsiEventType,
  getNhsnProcedure,
  resolveSsiSurveillanceDays,
  secondaryIncisionMismatchWarning,
  surveillanceNoteForSsi,
} from "./nkbv-ssi-nhsn-catalog";
import type { BaAnalysisSessionDraft } from "./nkbv-ba-analysis-session";

/** Phần tử chẩn đoán SSI (không gồm ngày mổ đơn thuần). */
export const SSI_DIAGNOSTIC_ELEMENT_KEYS = new Set([
  "purulent_drainage",
  "wound_opened",
  "wound_culture",
  "abscess_imaging",
  "physician_diagnosis",
]);

export type SsiDepth = Exclude<SsiVerificationData["ssi_depth"], "NONE">;

export type SsiSurveillanceOpts = {
  procedureCode?: string | null;
  hasImplantFallback?: boolean;
  eventTypeCode?: string | null;
};

/** Superficial/SIS/DIS luôn 30; DIP/Organ theo mã PT NHSN (fallback implant nếu thiếu mã). */
export function ssiSurveillancePeriodDays(
  depth: SsiDepth | "NONE",
  hasImplantOrOpts: boolean | SsiSurveillanceOpts = false,
): number {
  const opts: SsiSurveillanceOpts =
    typeof hasImplantOrOpts === "boolean"
      ? { hasImplantFallback: hasImplantOrOpts }
      : hasImplantOrOpts;
  return resolveSsiSurveillanceDays({
    depth,
    procedureCode: opts.procedureCode,
    hasImplantFallback: opts.hasImplantFallback,
    eventTypeCode: opts.eventTypeCode,
  });
}

/**
 * Surgery = Day 1 SP. Khớp evaluateSsi: còn trong khung khi daysBetween ≤ N
 * (days > N → EXPIRED) → ngày cuối SP = surgery + N.
 */
export function ssiSpEndDate(
  surgeryDate: string,
  depth: SsiDepth | "NONE",
  hasImplantOrOpts: boolean | SsiSurveillanceOpts = false,
): string {
  const n = ssiSurveillancePeriodDays(depth, hasImplantOrOpts);
  return addDays(surgeryDate.slice(0, 10), n);
}

export function ssiSpDateSet(
  surgeryDate: string,
  depth: SsiDepth | "NONE",
  hasImplantOrOpts: boolean | SsiSurveillanceOpts = false,
): Set<string> {
  const start = surgeryDate.slice(0, 10);
  const end = ssiSpEndDate(start, depth, hasImplantOrOpts);
  const out = new Set<string>();
  let c = start;
  let g = 0;
  while (c <= end && g < 120) {
    out.add(c);
    c = addDays(c, 1);
    g += 1;
  }
  return out;
}

export function ssiSbapDateSet(doe: string): Set<string> {
  const w = ssiSbapWindow(doe);
  const out = new Set<string>();
  let c = w.start;
  let g = 0;
  while (c <= w.end && g < 40) {
    out.add(c);
    c = addDays(c, 1);
    g += 1;
  }
  return out;
}

function collectKeysByDate(
  byDate: BaGridSymptomByDate,
  keys: Set<string>,
): Array<{ date: string; key: string; label: string }> {
  const out: Array<{ date: string; key: string; label: string }> = [];
  for (const [date, items] of Object.entries(byDate)) {
    for (const it of items) {
      if (keys.has(it.key)) {
        out.push({ date: date.slice(0, 10), key: it.key, label: it.label });
      }
    }
  }
  return out;
}

/** Ngày có phần tử chẩn đoán SSI ∈ SP (TC + abscess CĐHA + draft ticks). */
export function collectSsiDiagnosticDatesInSp(input: {
  tieuChuanByDate: BaGridSymptomByDate;
  draftLamSang?: BaGridSymptomByDate;
  cdha: BaGridCdhaCell[];
  spDates: Set<string>;
}): string[] {
  const dates = new Set<string>();
  for (const src of [input.tieuChuanByDate, input.draftLamSang || {}]) {
    for (const { date, key } of collectKeysByDate(src, SSI_DIAGNOSTIC_ELEMENT_KEYS)) {
      if (input.spDates.has(date)) dates.add(date);
      // wound_culture key may appear; abscess via key
      void key;
    }
  }
  for (const c of input.cdha) {
    if (c.tieu_chuan_key !== "abscess_imaging") continue;
    const d = c.ngay.slice(0, 10);
    if (input.spDates.has(d)) dates.add(d);
  }
  return [...dates].sort();
}

/**
 * DOE = phần tử chẩn đoán sớm nhất ∈ SP.
 * Ngày mổ đơn thuần không tạo DOE trừ khi cùng ngày có nhiễm (diagnostic cùng ngày).
 */
export function resolveSsiDoe(input: {
  surgeryDate: string | null;
  diagnosticDatesInSp: string[];
}): string | null {
  if (!input.diagnosticDatesInSp.length) return null;
  return input.diagnosticDatesInSp[0];
}

function anyKeyOnDates(
  sources: BaGridSymptomByDate[],
  dates: Set<string>,
  key: string,
): boolean {
  for (const src of sources) {
    for (const d of dates) {
      if ((src[d] || []).some((it) => it.key === key)) return true;
    }
  }
  return false;
}

function abscessInSp(cdha: BaGridCdhaCell[], spDates: Set<string>): boolean {
  return cdha.some(
    (c) =>
      c.tieu_chuan_key === "abscess_imaging" && spDates.has(c.ngay.slice(0, 10)),
  );
}

/** Map TC/ticks → cờ độ sâu evaluateSsi theo ssi_depth đang chọn. */
export function mapSsiCriteriaFlags(input: {
  depth: SsiDepth;
  tieuChuanByDate: BaGridSymptomByDate;
  draftLamSang: BaGridSymptomByDate;
  cdha: BaGridCdhaCell[];
  spDates: Set<string>;
}): Pick<
  SsiVerificationData,
  | "superficial_purulent_drainage"
  | "superficial_culture_positive"
  | "superficial_opened_with_inflammation"
  | "superficial_physician_diagnosis"
  | "deep_purulent_drainage"
  | "deep_dehisced_or_opened_with_symptoms"
  | "deep_abscess_imaging_pathology"
  | "organ_space_purulent_drainage"
  | "organ_space_culture_positive"
  | "organ_space_abscess_imaging_pathology"
  | "organ_space_obgyn_abdominal_pain"
> {
  const sources = [input.tieuChuanByDate, input.draftLamSang];
  const purulent = anyKeyOnDates(sources, input.spDates, "purulent_drainage");
  const opened = anyKeyOnDates(sources, input.spDates, "wound_opened");
  const culture = anyKeyOnDates(sources, input.spDates, "wound_culture");
  const physicianDx = anyKeyOnDates(sources, input.spDates, "physician_diagnosis");
  const obgynPain = anyKeyOnDates(sources, input.spDates, "obgyn_abdominal_pain");
  const abscess =
    anyKeyOnDates(sources, input.spDates, "abscess_imaging") ||
    abscessInSp(input.cdha, input.spDates);

  const empty = {
    superficial_purulent_drainage: false,
    superficial_culture_positive: false,
    superficial_opened_with_inflammation: false,
    superficial_physician_diagnosis: false,
    deep_purulent_drainage: false,
    deep_dehisced_or_opened_with_symptoms: false,
    deep_abscess_imaging_pathology: false,
    organ_space_purulent_drainage: false,
    organ_space_culture_positive: false,
    organ_space_abscess_imaging_pathology: false,
    organ_space_obgyn_abdominal_pain: false,
  };

  if (input.depth === "ORGAN_SPACE") {
    return {
      ...empty,
      organ_space_purulent_drainage: purulent,
      organ_space_culture_positive: culture,
      organ_space_abscess_imaging_pathology: abscess,
      organ_space_obgyn_abdominal_pain: obgynPain,
    };
  }
  if (input.depth === "DEEP") {
    return {
      ...empty,
      deep_purulent_drainage: purulent,
      deep_dehisced_or_opened_with_symptoms: opened,
      deep_abscess_imaging_pathology: abscess || culture,
    };
  }
  return {
    ...empty,
    superficial_purulent_drainage: purulent,
    superficial_culture_positive: culture,
    superficial_opened_with_inflammation: opened,
    superficial_physician_diagnosis: physicianDx,
  };
}

export type BuildSsiTimelineVerdictInput = {
  surgeryDate: string | null;
  /** Index ngày (mổ / TC / abscess) — dùng khi thiếu surgeryDate từ hàng mổ. */
  indexDate?: string | null;
  tieuChuanByDate: BaGridSymptomByDate;
  draftLamSang?: BaGridSymptomByDate;
  cdha: BaGridCdhaCell[];
  bloodXn: BaGridXnCell[];
  /** Cấy vết / Index wound organism nếu có. */
  woundOrganism?: string | null;
  ssiDepth?: SsiDepth;
  hasImplant?: boolean;
  isPatos?: boolean;
  procedureCode?: string | null;
  ssiEventType?: string | null;
  organSpaceSite?: string | null;
};

export type SsiTimelineGate = {
  surgeryDate: string | null;
  doe: string | null;
  spDays: number;
  spEnd: string | null;
  spDates: Set<string>;
  sbapDates: Set<string>;
  warnings: string[];
  noteImplantProxy: string;
};

export type SsiTimelineVerdict = {
  gate: SsiTimelineGate;
  data: SsiVerificationData;
  result: RuleEvaluationResult;
  criteriaMet: boolean;
  ketLuanLabel: string;
};

export function buildSsiTimelineVerdict(
  input: BuildSsiTimelineVerdictInput,
): SsiTimelineVerdict {
  const eventDepth = depthFromSsiEventType(input.ssiEventType);
  const depth: SsiDepth = eventDepth || input.ssiDepth || "SUPERFICIAL";
  const hasImplant = Boolean(input.hasImplant);
  const procedureCode = input.procedureCode || "";
  /** Chỉ ghi khi user/panel đã chọn — không tự mặc định SIP để giữ tương thích SSI_*. */
  const ssiEventType = input.ssiEventType || undefined;
  const organSpaceSite = input.organSpaceSite || undefined;
  const survOpts: SsiSurveillanceOpts = {
    procedureCode,
    hasImplantFallback: hasImplant,
    eventTypeCode: ssiEventType,
  };
  const surgery =
    input.surgeryDate?.slice(0, 10) ||
    input.indexDate?.slice(0, 10) ||
    null;
  const spDays = ssiSurveillancePeriodDays(depth, survOpts);
  const noteImplantProxy = surveillanceNoteForSsi({
    depth,
    procedureCode,
    hasImplantFallback: hasImplant,
    eventTypeCode: ssiEventType,
  });
  const warnings: string[] = [];

  if (!surgery) {
    warnings.push("Thiếu ngày mổ (Day 1 SP)");
  }
  if (depth !== "SUPERFICIAL" && !getNhsnProcedure(procedureCode)) {
    warnings.push("Chưa chọn mã phẫu thuật NHSN — SP Deep/Organ dùng fallback implant");
  }
  if (!ssiEventType) {
    warnings.push("Chưa chọn mã loại sự kiện NHSN (SIP/SIS/DIP/DIS/ORGAN_SPACE)");
  }
  const secWarn = secondaryIncisionMismatchWarning(ssiEventType, procedureCode);
  if (secWarn) warnings.push(secWarn);

  const spDates = surgery
    ? ssiSpDateSet(surgery, depth, survOpts)
    : new Set<string>();
  const spEnd = surgery ? ssiSpEndDate(surgery, depth, survOpts) : null;

  const diagnosticDates = collectSsiDiagnosticDatesInSp({
    tieuChuanByDate: input.tieuChuanByDate,
    draftLamSang: input.draftLamSang,
    cdha: input.cdha,
    spDates,
  });
  const doe = resolveSsiDoe({ surgeryDate: surgery, diagnosticDatesInSp: diagnosticDates });

  // TC ngoài SP → EXPIRED path via days_since_surgery
  const outOfSpDates: string[] = [];
  for (const src of [input.tieuChuanByDate, input.draftLamSang || {}]) {
    for (const { date } of collectKeysByDate(src, SSI_DIAGNOSTIC_ELEMENT_KEYS)) {
      if (surgery && !spDates.has(date)) outOfSpDates.push(date);
    }
  }
  if (outOfSpDates.length && !doe) {
    warnings.push(`TC ngoài SP (sau ${spEnd || "?"})`);
  }

  const flags = surgery
    ? mapSsiCriteriaFlags({
        depth,
        tieuChuanByDate: input.tieuChuanByDate,
        draftLamSang: input.draftLamSang || {},
        cdha: input.cdha,
        spDates,
      })
    : mapSsiCriteriaFlags({
        depth,
        tieuChuanByDate: {},
        draftLamSang: {},
        cdha: [],
        spDates: new Set(),
      });

  const sbap = doe ? ssiSbapWindow(doe) : { start: "", end: "" };
  const sbapDates = doe ? ssiSbapDateSet(doe) : new Set<string>();

  const woundOrg = input.woundOrganism || "";
  let bloodMatch = false;
  let bloodDate: string | undefined;
  let bloodOrg: string | undefined;
  let hasBloodInSbap = false;
  for (const b of input.bloodXn) {
    const d = b.ngay.slice(0, 10);
    if (!sbapDates.has(d)) continue;
    hasBloodInSbap = true;
    if (!bloodDate) {
      bloodDate = d;
      bloodOrg = b.vi_khuan;
    }
    if (woundOrg && organismsMatch(b.vi_khuan, woundOrg)) {
      bloodMatch = true;
      bloodDate = d;
      bloodOrg = b.vi_khuan;
      break;
    }
  }

  const daysSince =
    surgery && doe ? Math.max(0, daysBetween(surgery, doe)) : surgery && outOfSpDates.length
      ? Math.max(
          0,
          ...outOfSpDates.map((d) => daysBetween(surgery, d)),
        )
      : 0;

  // Force EXPIRED when only out-of-SP TC: use earliest out-of-SP as doe_date for engine
  const doeForEngine =
    doe ||
    (outOfSpDates.length
      ? [...outOfSpDates].sort()[0]
      : surgery || undefined);

  const data: SsiVerificationData = {
    days_since_surgery: daysSince,
    surgery_date: surgery || undefined,
    doe_date: doeForEngine,
    is_patos: Boolean(input.isPatos),
    has_implant: hasImplant,
    ssi_depth: depth,
    ssi_event_type: ssiEventType,
    organ_space_site: depth === "ORGAN_SPACE" ? organSpaceSite : undefined,
    ...flags,
    has_blood_culture_positive: hasBloodInSbap,
    blood_ssi_pathogen_matches: bloodMatch,
    blood_collection_date: bloodDate,
    blood_organism: bloodOrg,
    wound_organism: woundOrg || undefined,
    loai_phau_thuat_nhsn: procedureCode,
    calculated_doe: doe || undefined,
    calculated_sbap_start: sbap.start || undefined,
    calculated_sbap_end: sbap.end || undefined,
  };

  if (!doe && !outOfSpDates.length && !input.isPatos) {
    warnings.push("Chưa có phần tử chẩn đoán SSI ∈ SP (chảy mủ / mở vết / cấy / áp xe)");
  }

  const result = evaluateSsi(data);
  const criteriaMet =
    result.is_positive &&
    !["PATOS", "EXPIRED", "NO_INFECTION", "INCOMPLETE", "INVALID_SITE"].includes(
      result.classification,
    );
  const ketLuanLabel = [
    result.classification,
    result.is_positive ? undefined : result.reason.split(".")[0],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    gate: {
      surgeryDate: surgery,
      doe,
      spDays,
      spEnd,
      spDates,
      sbapDates,
      warnings,
      noteImplantProxy,
    },
    data,
    result,
    criteriaMet,
    ketLuanLabel,
  };
}

/**
 * Serialize nháp panel BA → cùng shape `SsiVerificationData` như phiếu SSI
 * (đủ mã PT / event / site trước khi neo verification_data).
 */
export function buildSsiVerdictFromBaDraft(input: {
  draft: BaAnalysisSessionDraft;
  surgeryDate: string | null;
  indexDate?: string | null;
  tieuChuanByDate: BaGridSymptomByDate;
  cdha: BaGridCdhaCell[];
  bloodXn: BaGridXnCell[];
  woundOrganism?: string | null;
}): SsiTimelineVerdict {
  const depth: SsiDepth =
    depthFromSsiEventType(input.draft.ssiEventType) ||
    input.draft.ssiDepth ||
    "SUPERFICIAL";
  const eventType =
    input.draft.ssiEventType ||
    (input.draft.readyToChot ? defaultSsiEventTypeForDepth(depth) : undefined) ||
    undefined;
  return buildSsiTimelineVerdict({
    surgeryDate: input.surgeryDate,
    indexDate: input.indexDate,
    tieuChuanByDate: input.tieuChuanByDate,
    draftLamSang: input.draft.lamSang,
    cdha: input.cdha,
    bloodXn: input.bloodXn,
    woundOrganism: input.woundOrganism,
    ssiDepth: depth,
    hasImplant: Boolean(input.draft.hasImplant),
    isPatos: Boolean(input.draft.isPatos),
    procedureCode: input.draft.loaiPhauThuatNhsn || "",
    ssiEventType: eventType,
    organSpaceSite: input.draft.organSpaceSite,
  });
}
