/**
 * Registry Chương 17 vận hành (Phần II + REPR SSI OB/GYN) + evaluateCh17Type.
 */
import {
  collectEvidenceKeys,
  evaluateCh17TypeDef,
  type Ch17EvalContext,
  type Ch17EvalResult,
  type Ch17TypeDef,
} from "./nkbv-ch17-criteria";
import { CH17_BJ_DEFS } from "./nkbv-ch17-def-bj";
import { CH17_CNS_DEFS } from "./nkbv-ch17-def-cns";
import { CH17_CVS_DEFS } from "./nkbv-ch17-def-cvs";
import { CH17_GI_DEFS } from "./nkbv-ch17-def-gi";
import { CH17_LRI_DEFS } from "./nkbv-ch17-def-lri";
import { CH17_REPR_DEFS } from "./nkbv-ch17-def-repr";

export const CH17_TYPE_DEFS: readonly Ch17TypeDef[] = [
  ...CH17_BJ_DEFS,
  ...CH17_CNS_DEFS,
  ...CH17_CVS_DEFS,
  ...CH17_GI_DEFS,
  ...CH17_LRI_DEFS,
  ...CH17_REPR_DEFS,
];

const BY_CODE = new Map(CH17_TYPE_DEFS.map((d) => [d.code.toUpperCase(), d]));

export function ch17TypeDef(code: string | null | undefined): Ch17TypeDef | null {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  return BY_CODE.get(c) ?? null;
}

export function ch17OperationalTypeCodes(): string[] {
  return CH17_TYPE_DEFS.map((d) => d.code);
}

export function evaluateCh17Type(input: {
  typeCode: string | null | undefined;
  evidence: Record<string, boolean>;
  procedureCode?: string | null;
  isInfantLe1?: boolean;
}): Ch17EvalResult {
  const def = ch17TypeDef(input.typeCode);
  if (!def) {
    return {
      applicable: false,
      met: false,
      metCriterion: null,
      reason: "Site Ch.17 chưa có định nghĩa vận hành — dùng tiêu chí Organ/Space chung.",
      missing: [],
    };
  }
  const ctx: Ch17EvalContext = {
    evidence: input.evidence || {},
    procedureCode: input.procedureCode,
    isInfantLe1: input.isInfantLe1,
  };
  return evaluateCh17TypeDef(def, ctx);
}

/** Evidence keys for UI checklist (union of all criteria nodes). */
export function ch17EvidenceKeysForType(typeCode: string | null | undefined): string[] {
  const def = ch17TypeDef(typeCode);
  if (!def) return [];
  const set = new Set<string>();
  for (const c of def.criteria) collectEvidenceKeys(c.node, set);
  return [...set];
}

export function ch17CriteriaSummaryForType(typeCode: string | null | undefined): Array<{
  code: string;
  label_vi: string;
  keys: string[];
}> {
  const def = ch17TypeDef(typeCode);
  if (!def) return [];
  return def.criteria.map((c) => ({
    code: c.code,
    label_vi: c.label_vi,
    keys: [...collectEvidenceKeys(c.node)],
  }));
}
