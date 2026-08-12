/**
 * Map phiên phân tích BA (draft + LS) → verification_data seed khi Tạo phiếu.
 * Thuần logic — không I/O.
 */

import type { BaAnalysisSessionDraft } from "./nkbv-ba-analysis-session";
import type { BaGridSymptomByDate, BaGridXnCell } from "./nkbv-ba-grid-engine";
import {
  criteriaKeyToFormField,
  type CriteriaMapContext,
} from "./nkbv-clinical-symptom-catalog";
import type { SyndromePanelId } from "./nkbv-specimen-syndrome";
import { bareViSinhIdFromMilestoneId } from "./nkbv-vi-sinh-analysis-status";
import { isBloodSpecimen } from "./nkbv-sbap-rit-chips";
import { clinicalRitEnd } from "./nkbv-shared-timeline";

/** Lab seed từ timeline BA → form phiếu. */
export type BaSeedLabRow = {
  id: string;
  ngay: string;
  benh_pham?: string;
  vi_khuan?: string | null;
  so_luong?: string | null;
  is_index?: boolean;
};

export type BaCdcWindowSeed = {
  iwp_start?: string | null;
  iwp_end?: string | null;
  sbap_start?: string | null;
  sbap_end?: string | null;
  rit_end?: string | null;
  doe?: string | null;
};

export type AnalysisCreateSeed = {
  draft: BaAnalysisSessionDraft;
  /** UUID vi sinh thô (đã strip lis:) — Index + RIT + Secondary blood. */
  analyzedViSinhIds: string[];
  nsk?: string | null;
  isSecondaryBsi?: boolean;
  ketLuan?: string | null;
  tacNhan?: string | null;
};

function syndromeCtx(
  panel: SyndromePanelId,
  draft: BaAnalysisSessionDraft,
): CriteriaMapContext {
  if (panel === "SSI") {
    return { syndrome: "SSI", ssiDepth: draft.ssiDepth || "SUPERFICIAL" };
  }
  if (panel === "PNEU") return { syndrome: "PNEU" };
  if (panel === "VAE") return { syndrome: "VAE" };
  if (panel === "UTI") return { syndrome: "UTI" };
  if (panel === "BSI") return { syndrome: "BSI" };
  return {};
}

/** LamSang by date → symptom_dates + boolean flags. */
export function mapLamSangToFormFields(
  lamSang: BaGridSymptomByDate,
  ctx: CriteriaMapContext,
): { symptom_dates: Record<string, string>; flags: Record<string, boolean> } {
  const symptom_dates: Record<string, string> = {};
  const flags: Record<string, boolean> = {};
  for (const [date, items] of Object.entries(lamSang || {})) {
    const d = String(date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    for (const it of items || []) {
      const field = criteriaKeyToFormField(it.key, ctx);
      if (!field) continue;
      flags[field] = true;
      if (!symptom_dates[field] || d < symptom_dates[field]) {
        symptom_dates[field] = d;
      }
    }
  }
  return { symptom_dates, flags };
}

function collectBareIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const bare = bareViSinhIdFromMilestoneId(String(raw || "")) || String(raw || "").trim();
    if (!bare || !/^[0-9a-f-]{36}$/i.test(bare)) continue;
    const key = bare.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(bare);
  }
  return out;
}

/** Gộp Index + RIT attributed + blood Secondary → danh sách đánh dấu DA_PT. */
export function collectAnalyzedViSinhIds(input: {
  indexMilestoneId: string;
  attributedXnIds?: string[];
  secondaryBloodIds?: string[];
  bloodCriterionIds?: string[];
}): string[] {
  return collectBareIds([
    input.indexMilestoneId,
    ...(input.attributedXnIds || []),
    ...(input.secondaryBloodIds || []),
    ...(input.bloodCriterionIds || []),
  ]);
}

function xnToLabRow(x: BaGridXnCell, isIndex: boolean): BaSeedLabRow {
  return {
    id: x.id,
    ngay: String(x.ngay || "").slice(0, 10),
    benh_pham: x.benh_pham,
    vi_khuan: x.vi_khuan,
    so_luong: x.so_luong ?? null,
    is_index: isIndex || undefined,
  };
}

/** Xây rit_labs / sbap_labs từ XN timeline + id đã attribute. */
export function buildBaSeedLabs(input: {
  xn: BaGridXnCell[];
  indexId: string;
  attributedXnIds: string[];
  secondaryBloodIds: string[];
  sbapDates?: ReadonlySet<string> | string[];
}): { rit_labs: BaSeedLabRow[]; sbap_labs: BaSeedLabRow[] } {
  const attr = new Set(input.attributedXnIds.map(String));
  const bloodIds = new Set(input.secondaryBloodIds.map(String));
  const sbapDays = new Set(
    Array.from(input.sbapDates ?? []).map((d) => String(d).slice(0, 10)),
  );

  const rit_labs: BaSeedLabRow[] = [];
  const sbap_labs: BaSeedLabRow[] = [];
  const seenRit = new Set<string>();
  const seenSbap = new Set<string>();

  for (const x of input.xn) {
    const isIx = x.id === input.indexId;
    if (isIx || attr.has(x.id)) {
      if (!seenRit.has(x.id)) {
        seenRit.add(x.id);
        rit_labs.push(xnToLabRow(x, isIx));
      }
    }
    const d = String(x.ngay || "").slice(0, 10);
    if (isBloodSpecimen(x.benh_pham) && (bloodIds.has(x.id) || sbapDays.has(d))) {
      if (!seenSbap.has(x.id)) {
        seenSbap.add(x.id);
        sbap_labs.push(xnToLabRow(x, false));
      }
    }
  }

  rit_labs.sort((a, b) => a.ngay.localeCompare(b.ngay));
  sbap_labs.sort((a, b) => a.ngay.localeCompare(b.ngay));
  return { rit_labs, sbap_labs };
}

function deviceDatesFromCanThiep(canThiepDates: string[]): {
  device_placed_date?: string;
  device_removed_date?: string;
} {
  const days = [...canThiepDates]
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (!days.length) return {};
  const placed = days[0];
  const removed = days[days.length - 1];
  return {
    device_placed_date: placed,
    device_removed_date: removed !== placed ? removed : undefined,
  };
}

/**
 * Seed verification_data khi neo phiếu từ bảng phân tích.
 * Prepopulate* sẽ đọc các boolean / symptom_dates / cửa sổ CDC này.
 */
export function mapAnalysisSessionToVerificationSeed(input: {
  panel: SyndromePanelId;
  draft: BaAnalysisSessionDraft;
  indexMilestoneId: string;
  indexKind?: "XN" | "CDHA" | "TIEU_CHUAN";
  nsk?: string | null;
  isSecondaryBsi?: boolean;
  ketLuan?: string | null;
  attributedXnIds?: string[];
  secondaryBloodIds?: string[];
  windows?: BaCdcWindowSeed | null;
  ritLabs?: BaSeedLabRow[];
  sbapLabs?: BaSeedLabRow[];
}): {
  verification_data: Record<string, unknown>;
  clinical_notes_patch: Record<string, unknown>;
  analyzedViSinhIds: string[];
} {
  const ctx = syndromeCtx(input.panel, input.draft);
  const { symptom_dates, flags } = mapLamSangToFormFields(input.draft.lamSang, ctx);
  const indexId = bareViSinhIdFromMilestoneId(input.indexMilestoneId);
  const analyzedViSinhIds = collectAnalyzedViSinhIds({
    indexMilestoneId: input.indexMilestoneId,
    attributedXnIds: input.attributedXnIds,
    secondaryBloodIds: input.secondaryBloodIds,
    bloodCriterionIds: input.draft.bloodCriterionIds,
  });

  const secondary =
    Boolean(input.isSecondaryBsi) ||
    Boolean(input.draft.bsiLocalizedSite?.criteriaMet) ||
    (input.panel !== "BSI" && (input.secondaryBloodIds?.length || 0) > 0);

  if (
    (input.panel === "PNEU" || input.panel === "VAE") &&
    input.indexKind === "CDHA"
  ) {
    flags.has_chest_imaging_abnormal = true;
    if (!symptom_dates.has_chest_imaging_abnormal && input.nsk) {
      symptom_dates.has_chest_imaging_abnormal = String(input.nsk).slice(0, 10);
    }
  }

  const doe = String(input.nsk || input.windows?.doe || "").slice(0, 10) || undefined;
  const iwpStart = input.windows?.iwp_start
    ? String(input.windows.iwp_start).slice(0, 10)
    : undefined;
  const iwpEnd = input.windows?.iwp_end
    ? String(input.windows.iwp_end).slice(0, 10)
    : undefined;
  const sbapStart = input.windows?.sbap_start
    ? String(input.windows.sbap_start).slice(0, 10)
    : undefined;
  const sbapEnd = input.windows?.sbap_end
    ? String(input.windows.sbap_end).slice(0, 10)
    : undefined;
  const ritEnd = input.windows?.rit_end
    ? String(input.windows.rit_end).slice(0, 10)
    : doe
      ? clinicalRitEnd(doe)
      : undefined;

  const device = deviceDatesFromCanThiep(input.draft.canThiepDates || []);

  const verification_data: Record<string, unknown> = {
    ...flags,
    symptom_dates,
    index_vi_sinh_id: indexId || undefined,
    attributed_vi_sinh_ids: analyzedViSinhIds,
    calculated_doe: doe,
    doe_date: doe,
    calculated_iwp_start: iwpStart,
    calculated_iwp_end: iwpEnd,
    calculated_sbap_start: sbapStart,
    calculated_sbap_end: sbapEnd,
    calculated_rit_end: ritEnd,
    is_secondary_bsi: secondary || undefined,
    blood_criterion_ids: input.draft.bloodCriterionIds?.length
      ? input.draft.bloodCriterionIds
      : undefined,
    ba_rit_labs: input.ritLabs?.length ? input.ritLabs : undefined,
    ba_sbap_labs: input.sbapLabs?.length ? input.sbapLabs : undefined,
    seeded_from_ba_analysis: true,
    ...device,
  };

  // SBAP blood detail (ngày / VK đầu tiên)
  const firstSbap = (input.sbapLabs || [])[0];
  if (firstSbap) {
    verification_data.blood_collection_date = firstSbap.ngay;
    if (firstSbap.vi_khuan) verification_data.blood_organism = firstSbap.vi_khuan;
  }

  if (input.panel === "PNEU" || input.panel === "VAE") {
    if (input.draft.hasCardiopulmonaryDisease) {
      verification_data.has_cardiopulmonary_disease_underlying = true;
    }
    if (input.indexKind === "CDHA") {
      verification_data.pneu_trigger = "IMAGING";
    } else if (input.indexKind === "XN") {
      verification_data.pneu_trigger = "CULTURE";
    }
  }

  if (input.panel === "UTI" && secondary) {
    verification_data.has_blood_culture_positive_in_window = true;
    verification_data.blood_urine_pathogen_matches = true;
  }
  if (input.panel === "PNEU" && secondary) {
    verification_data.has_blood_culture_in_event_period = true;
    verification_data.blood_respiratory_pathogen_matches = true;
  }
  if (input.panel === "SSI" && secondary) {
    verification_data.has_blood_culture_positive = true;
    verification_data.blood_ssi_pathogen_matches = true;
  }

  if (input.panel === "BSI" && input.draft.bsiLocalizedSite?.criteriaMet) {
    verification_data.has_localized_infection = true;
    verification_data.is_in_sbap_window = true;
    verification_data.localized_pathogen_matches = true;
    if (input.draft.bsiLocalizedSite.bloodMandatory) {
      verification_data.blood_mandatory_for_localized = true;
    }
    if (input.draft.bsiLocalizedSite.majorType) {
      verification_data.localized_site_type = input.draft.bsiLocalizedSite.majorType;
    }
  }

  if (input.panel === "SSI") {
    if (input.draft.ssiDepth) {
      verification_data.infection_depth = input.draft.ssiDepth;
      verification_data.ssi_depth = input.draft.ssiDepth;
    }
    if (input.draft.hasImplant != null) verification_data.has_implant = input.draft.hasImplant;
    if (input.draft.isPatos != null) verification_data.is_patos = input.draft.isPatos;
    if (input.draft.ssiEventType) verification_data.ssi_event_type = input.draft.ssiEventType;
    if (input.draft.organSpaceSite) {
      verification_data.organ_space_site = input.draft.organSpaceSite;
    }
    if (input.draft.loaiPhauThuatNhsn) {
      verification_data.procedure_code = input.draft.loaiPhauThuatNhsn;
      verification_data.loai_phau_thuat_nhsn = input.draft.loaiPhauThuatNhsn;
    }
  }

  const ketLuan = (input.ketLuan || input.draft.ketLuan || "").trim();
  const clinical_notes_patch: Record<string, unknown> = {};
  if (ketLuan) {
    clinical_notes_patch.ghi_chu_tuy_bien = ketLuan;
    clinical_notes_patch.tom_tat_dien_bien = ketLuan;
  }
  if (input.ritLabs?.length || input.sbapLabs?.length) {
    const ritLine = (input.ritLabs || [])
      .map(
        (l) =>
          `${l.ngay}${l.is_index ? " (Index)" : ""} · ${l.benh_pham || "XN"} · ${l.vi_khuan || "—"}`,
      )
      .join("; ");
    const sbapLine = (input.sbapLabs || [])
      .map((l) => `${l.ngay} · Máu · ${l.vi_khuan || "—"}`)
      .join("; ");
    const parts = [
      ritLine ? `RIT labs: ${ritLine}` : "",
      sbapLine ? `SBAP labs: ${sbapLine}` : "",
    ].filter(Boolean);
    if (parts.length) {
      clinical_notes_patch.ba_seed_lab_summary = parts.join("\n");
    }
  }

  return { verification_data, clinical_notes_patch, analyzedViSinhIds };
}
