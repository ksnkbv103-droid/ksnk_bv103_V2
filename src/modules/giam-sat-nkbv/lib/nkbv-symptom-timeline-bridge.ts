/**
 * Cầu nối symptomDates (form điều tra) ↔ criteria_key (timeline BA).
 * SSOT ánh xạ: `nkbv-clinical-symptom-catalog.ts`.
 */

import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import type { NkbvCriteriaKey } from "./nkbv-criteria-matrix";
import { NKBV_CRITERIA_ADD_CATALOG } from "./nkbv-criteria-matrix";
import {
  buildFormFieldToTimelineMap,
  catalogTitleForCriteriaKey,
  criteriaKeyToFormField,
  displaySymptomLabel,
  type CriteriaMapContext,
  type SymptomTimelineMapEntry,
} from "./nkbv-clinical-symptom-catalog";

export const FORM_SYNC_DETAIL_PREFIX = "form_sync:";

export type { SymptomTimelineMapEntry };

/** form field (symptomDates key) → yếu tố timeline — SSOT catalog */
export const SYMPTOM_DATE_TO_TIMELINE: Record<string, SymptomTimelineMapEntry> =
  buildFormFieldToTimelineMap();

/** Alias bridge — hỗ trợ ngữ cảnh hội chứng / độ sâu SSI */
export function criteriaKeyToSymptomDateKey(
  criteriaKey: string | null | undefined,
  ctx?: CriteriaMapContext,
): string | null {
  return criteriaKeyToFormField(criteriaKey, ctx);
}

/** Mốc có thể làm Index mở form điều tra trên BA. */
export function isBaIndexMilestone(m: BaTimelineMilestone): boolean {
  if (m.source === "DEVICE" || m.source === "EVENT") return false;
  if (m.source === "LIS") return true;
  if (m.kind === "IMAGING_CHEST" || m.criteriaKey === "imaging_chest") return true;
  if (m.kind === "PROCEDURE_SURGERY" || m.criteriaKey === "procedure_surgery") return true;
  if (
    m.criteriaKey === "urine_culture" ||
    m.criteriaKey === "blood_culture" ||
    m.criteriaKey === "resp_culture" ||
    m.criteriaKey === "wound_culture" ||
    m.criteriaKey === "abscess_imaging"
  ) {
    return true;
  }
  return false;
}

/** Mốc yếu tố (triệu chứng/XQ đã gắn) — có thể đưa vào form Index đang mở. */
export function isBaFactorMilestone(m: BaTimelineMilestone): boolean {
  if (!m.criteriaKey) return false;
  if (m.source === "DEVICE" || m.source === "EVENT") return false;
  return Boolean(
    criteriaKeyToFormField(m.criteriaKey) ||
      m.kind === "SYMPTOM" ||
      m.kind === "IMAGING_CHEST",
  );
}

export function timelineMilestoneToSymptomPatch(
  m: BaTimelineMilestone,
  ctx?: CriteriaMapContext,
): { key: string; date: string; label: string } | null {
  const key = criteriaKeyToFormField(m.criteriaKey || null, ctx);
  if (!key) return null;
  const date = String(m.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { key, date, label: displaySymptomLabel({
    criteriaKey: m.criteriaKey,
    storedTitle: m.title,
  }) || m.title };
}

export function dateInInclusiveWindow(
  date: string,
  windowStart: string | null | undefined,
  windowEnd: string | null | undefined,
): boolean {
  const d = String(date || "").slice(0, 10);
  const a = String(windowStart || "").slice(0, 10);
  const b = String(windowEnd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  if (!a || !b) return true; // chưa có IWP — vẫn cho gắn
  return d >= a && d <= b;
}

/** Prefill symptomDates từ mốc timeline nằm trong cửa sổ IWP (không ghi đè ngày đã có). */
export function prefillSymptomDatesFromTimeline(input: {
  milestones: BaTimelineMilestone[];
  iwpStart?: string | null;
  iwpEnd?: string | null;
  existing: Record<string, string>;
  /** Hội chứng / độ sâu SSI — map criteria_key đúng field form. */
  mapContext?: CriteriaMapContext;
}): Record<string, string> {
  const next = { ...input.existing };
  for (const m of input.milestones) {
    const patch = timelineMilestoneToSymptomPatch(m, input.mapContext);
    if (!patch) continue;
    if (!dateInInclusiveWindow(patch.date, input.iwpStart, input.iwpEnd)) continue;
    if (next[patch.key]) continue;
    next[patch.key] = patch.date;
  }
  return next;
}

export function catalogMetaForCriteria(
  criteriaKey: NkbvCriteriaKey,
): SymptomTimelineMapEntry | null {
  const formKey = criteriaKeyToFormField(criteriaKey);
  if (formKey) {
    const fromForm = SYMPTOM_DATE_TO_TIMELINE[formKey];
    if (fromForm && fromForm.criteriaKey === criteriaKey) return fromForm;
    const title = catalogTitleForCriteriaKey(criteriaKey);
    if (title) {
      return {
        criteriaKey,
        milestoneKind:
          criteriaKey === "imaging_chest" || criteriaKey === "abscess_imaging"
            ? "IMAGING_CHEST"
            : "SYMPTOM",
        title,
      };
    }
  }
  const cat = NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === criteriaKey);
  if (!cat) return null;
  return {
    criteriaKey: cat.criteriaKey,
    milestoneKind: cat.milestoneKind,
    title: cat.title,
  };
}

export function formSyncDetail(symptomKey: string): string {
  return `${FORM_SYNC_DETAIL_PREFIX}${symptomKey}`;
}

export function symptomKeyFromFormSyncDetail(detail: string | null | undefined): string | null {
  const d = String(detail || "");
  if (!d.startsWith(FORM_SYNC_DETAIL_PREFIX)) return null;
  return d.slice(FORM_SYNC_DETAIL_PREFIX.length) || null;
}
