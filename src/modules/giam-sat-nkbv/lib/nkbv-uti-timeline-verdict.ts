/**
 * Bridge draft timeline UTI → evaluateUtiCauti (SSOT §7) — không rule song song.
 */

import type { UtiVerificationData } from "../types/nkbv-verification";
import { evaluateUtiCauti, type RuleEvaluationResult } from "./nkbv-rules-engine";
import type { BaGridSymptomByDate, BaGridXnCell } from "./nkbv-ba-grid-engine";
import {
  UTI_INFANT_CRITERIA_KEYS,
  UTI_VOIDING_CRITERIA_KEYS,
} from "./nkbv-ba-grid-engine";
import { organismsMatch } from "./nkbv-secondary-bsi-gate";
import { deviceAssociationFromCanThiepDates } from "./nkbv-shared-timeline";

const YEAST_RE = /candida|yeast|nấm men|nam men|fungi|ký sinh/i;

export function parseUrineCfu(soLuong: string | null | undefined): number | null {
  if (soLuong == null) return null;
  const s = String(soLuong).trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const sci = s.match(/(\d+(?:\.\d+)?)\s*\^\s*(\d+)/);
  if (sci) {
    const base = Number(sci[1]);
    const exp = Number(sci[2]);
    if (Number.isFinite(base) && Number.isFinite(exp)) return Math.round(base ** exp);
  }
  const eNot = s.match(/(\d+(?:\.\d+)?)\s*e\s*\+?\s*(\d+)/i);
  if (eNot) {
    const base = Number(eNot[1]);
    const exp = Number(eNot[2]);
    if (Number.isFinite(base) && Number.isFinite(exp)) return Math.round(base * 10 ** exp);
  }
  const digits = s.replace(/[^\d.]/g, "");
  if (digits) {
    const n = Number(digits);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

export function isYeastOrganism(org: string | null | undefined): boolean {
  return YEAST_RE.test(String(org || ""));
}

/** Đếm loài từ LIS: «3 loài» trong SL, hoặc tách tên bằng + / , / và. */
export function countUrineSpecies(
  tacNhan: string | null | undefined,
  soLuong?: string | null,
): number {
  const sl = String(soLuong || "");
  const fromSl = sl.match(/(\d+)\s*loài/i);
  if (fromSl) {
    const n = Number(fromSl[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const name = String(tacNhan || "").trim();
  if (!name || name === "—") return 0;
  const parts = name
    .split(/\s*[+,;/]\s*|\s+và\s+|\s+\+\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

export type UtiIndexLabGate = {
  cfu: number | null;
  cfuOk: boolean;
  yeast: boolean;
  pathogenCount: number;
  warnings: string[];
};

function splitUrineOrganisms(tacNhan: string | null | undefined): string[] {
  const name = String(tacNhan || "").trim();
  if (!name || name === "—") return [];
  return name
    .split(/\s*[+,;/]\s*|\s+và\s+|\s+\+\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Bỏ nấm; giữ vi khuẩn — yeast + 1 bacterium ≥10⁵ vẫn xét bacterium. */
export function urineBacterialSpecies(tacNhan: string | null | undefined): string[] {
  return splitUrineOrganisms(tacNhan).filter((p) => !isYeastOrganism(p));
}

export function gateUtiIndexLab(indexXn: BaGridXnCell | null): UtiIndexLabGate {
  const warnings: string[] = [];
  if (!indexXn) {
    return { cfu: null, cfuOk: false, yeast: false, pathogenCount: 0, warnings: ["Thiếu Index nước tiểu"] };
  }
  const cfu = parseUrineCfu(indexXn.so_luong);
  const parts = splitUrineOrganisms(indexXn.vi_khuan);
  const bacteria = parts.filter((p) => !isYeastOrganism(p));
  const yeastOnly = parts.length > 0 && bacteria.length === 0;
  const mixed = /tạp nhiễm|mixed\s*flora|≥\s*3|>=\s*3/i.test(
    `${indexXn.so_luong || ""} ${indexXn.vi_khuan || ""}`,
  );
  const pathogenCount = mixed ? 3 : countUrineSpecies(indexXn.vi_khuan, indexXn.so_luong);
  const bacterialCount = mixed ? pathogenCount : bacteria.length || (yeastOnly ? 0 : pathogenCount);
  if (yeastOnly) warnings.push("Nấm/Candida — không đủ làm Index UTI");
  if (parts.some((p) => isYeastOrganism(p)) && bacteria.length > 0) {
    warnings.push("Bỏ nấm, xét vi khuẩn còn lại");
  }
  if (cfu != null && cfu < 100000) warnings.push("CFU < 10⁵");
  if (cfu == null) warnings.push("Thiếu số khuẩn lạc — không đạt lab");
  const cfuOk = !yeastOnly && cfu != null && cfu >= 100000 && bacterialCount > 0 && bacterialCount <= 2;
  return { cfu, cfuOk, yeast: yeastOnly, pathogenCount: bacterialCount || pathogenCount, warnings };
}

export function stripUtiVoidingFromLamSang(
  lamSang: BaGridSymptomByDate,
  foleyDates: string[],
): BaGridSymptomByDate {
  const foley = new Set(foleyDates.map((d) => d.slice(0, 10)));
  const out: BaGridSymptomByDate = {};
  for (const [date, items] of Object.entries(lamSang)) {
    if (foley.has(date.slice(0, 10))) {
      out[date] = items.filter((it) => !UTI_VOIDING_CRITERIA_KEYS.has(it.key));
    } else {
      out[date] = items;
    }
  }
  return out;
}

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

export type BuildUtiTimelineVerdictInput = {
  indexXn: BaGridXnCell | null;
  lamSang: BaGridSymptomByDate;
  canThiepDates: string[];
  iwpDates: Set<string>;
  nsk: string | null;
  bloodXn: BaGridXnCell[];
  /** Máu gắn ABUTI (ids). */
  abutiBloodIds: string[];
  isInfantLe1?: boolean;
  admissionDate?: string | null;
  dischargeDate?: string | null;
  devicePlacedDate?: string | null;
  deviceRemovedDate?: string | null;
};

export type UtiTimelineVerdict = {
  lab: UtiIndexLabGate;
  result: RuleEvaluationResult;
  criteriaMet: boolean;
  ketLuanLabel: string;
};

export function buildUtiTimelineVerdict(
  input: BuildUtiTimelineVerdictInput,
): UtiTimelineVerdict {
  const lab = gateUtiIndexLab(input.indexXn);
  const lamSang = stripUtiVoidingFromLamSang(input.lamSang, input.canThiepDates);
  const doe = input.nsk || input.indexXn?.ngay.slice(0, 10) || "";

  const foleyDates = input.canThiepDates.map((d) => d.slice(0, 10)).sort();
  const assoc = doe
    ? deviceAssociationFromCanThiepDates(input.canThiepDates, doe, {
        placedDate: input.devicePlacedDate || foleyDates[0] || null,
        removedDate: input.deviceRemovedDate || null,
        admissionDate: input.admissionDate,
        dischargeDate: input.dischargeDate,
      })
    : { placedDays: 0, activeOnEvent: false, associated: false };
  const foleyPlacedDays = assoc.placedDays;
  const foleyActive = assoc.activeOnEvent;
  // Seed form theo đợt liên tục đã gắn (không lấy ngày sổ làm phình CAUTI)
  const placed = assoc.episodeStart || input.devicePlacedDate?.slice(0, 10) || foleyDates[0] || "";
  const removed =
    assoc.episodeRemoved !== undefined
      ? assoc.episodeRemoved
      : input.deviceRemovedDate?.slice(0, 10) || null;

  const hasFever = anyKeyInIwp(lamSang, input.iwpDates, ["fever", "fever_or_wbc"]);
  const hasSupra = anyKeyInIwp(lamSang, input.iwpDates, ["suprapubic_pain"]);
  const hasCva = anyKeyInIwp(lamSang, input.iwpDates, ["cva_pain"]);
  const hasDysuria = anyKeyInIwp(lamSang, input.iwpDates, ["dysuria"]);
  const hasUrgency = anyKeyInIwp(lamSang, input.iwpDates, ["urgency"]);
  const hasFrequency = anyKeyInIwp(lamSang, input.iwpDates, ["frequency"]);
  const hasInfantHypo = anyKeyInIwp(lamSang, input.iwpDates, ["infant_hypothermia"]);
  const hasInfantApnea = anyKeyInIwp(lamSang, input.iwpDates, ["infant_apnea"]);
  const hasInfantBrady = anyKeyInIwp(lamSang, input.iwpDates, ["infant_bradycardia"]);
  const hasInfantLeth = anyKeyInIwp(lamSang, input.iwpDates, ["infant_lethargy"]);
  const hasInfantVom = anyKeyInIwp(lamSang, input.iwpDates, ["infant_vomiting"]);

  const abutiBloods = input.bloodXn.filter(
    (b) =>
      input.abutiBloodIds.includes(b.id) && input.iwpDates.has(b.ngay.slice(0, 10)),
  );
  const urineOrg = urineBacterialSpecies(input.indexXn?.vi_khuan).join(" + ")
    || input.indexXn?.vi_khuan
    || "";
  let bloodMatch = false;
  let bloodDate: string | undefined;
  let bloodOrg: string | undefined;
  for (const b of abutiBloods) {
    if (organismsMatch(b.vi_khuan, urineOrg)) {
      bloodMatch = true;
      bloodDate = b.ngay.slice(0, 10);
      bloodOrg = b.vi_khuan;
      break;
    }
  }
  const data: UtiVerificationData = {
    urine_cfu_count: lab.cfu ?? 0,
    pathogen_count: lab.pathogenCount,
    has_fungi_yeast_parasite: lab.yeast,
    foley_placed_days: foleyPlacedDays,
    foley_active_on_event: foleyActive,
    // CAUTI chỉ khi đủ ≥3d — không dùng «có Foley 1 ngày» làm present-for-CAUTI
    foley_present_doe_or_prior: assoc.associated,
    device_placed_date: placed || undefined,
    device_removed_date: removed || undefined,
    has_fever: hasFever,
    has_suprapubic_tenderness: hasSupra,
    has_costovertebral_pain: hasCva,
    has_dysuria: hasDysuria,
    has_urgency: hasUrgency,
    has_frequency: hasFrequency,
    is_infant_le1: Boolean(input.isInfantLe1),
    has_infant_hypothermia: hasInfantHypo,
    has_infant_apnea: hasInfantApnea,
    has_infant_bradycardia: hasInfantBrady,
    has_infant_lethargy: hasInfantLeth,
    has_infant_vomiting: hasInfantVom,
    has_blood_culture_positive_in_window: abutiBloods.length > 0,
    blood_urine_pathogen_matches: bloodMatch,
    blood_collection_date: bloodDate,
    blood_organism: bloodOrg,
    urine_organism: urineOrg || undefined,
    calculated_doe: doe || undefined,
    calculated_iwp_start: [...input.iwpDates].sort()[0],
    calculated_iwp_end: [...input.iwpDates].sort().at(-1),
  };

  let result = evaluateUtiCauti(data);
  if (
    result.is_positive &&
    /SUTI/.test(result.classification) &&
    !result.is_secondary_bsi
  ) {
    const sbapStart = input.indexXn?.ngay
      ? addDay(input.indexXn.ngay, -3)
      : doe
        ? addDay(doe, -3)
        : "";
    const sbapEnd = doe ? addDay(doe, 13) : "";
    const secBlood = input.bloodXn.some((b) => {
      const d = b.ngay.slice(0, 10);
      if (!sbapStart || !sbapEnd || d < sbapStart || d > sbapEnd) return false;
      if (isYeastOrganism(b.vi_khuan)) return false;
      return organismsMatch(b.vi_khuan, urineOrg);
    });
    if (secBlood) {
      result = { ...result, is_secondary_bsi: true };
    }
  }
  const criteriaMet = result.is_positive && result.classification !== "ASB";
  const ketLuanLabel = [
    result.classification,
    result.is_positive ? undefined : result.reason.split(".")[0],
  ]
    .filter(Boolean)
    .join(" · ");

  return { lab, result, criteriaMet, ketLuanLabel };
}

function addDay(iso: string, n: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ageYearsFromNgaySinh(
  ngaySinh: string | null | undefined,
  onDate?: string | null,
): number | null {
  if (!ngaySinh) return null;
  const birth = new Date(`${ngaySinh.slice(0, 10)}T12:00:00`);
  const ref = new Date(`${(onDate || new Date().toISOString()).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function isInfantLe1FromAge(ageYears: number | null): boolean {
  return ageYears != null && ageYears <= 1;
}

export { UTI_VOIDING_CRITERIA_KEYS, UTI_INFANT_CRITERIA_KEYS };
